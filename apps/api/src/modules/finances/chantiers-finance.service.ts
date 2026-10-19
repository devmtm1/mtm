import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import { nombre } from './finances.calculs';
import {
  CreatePaiementChantierDto,
  DefinirEcheancesDto,
  QueryPaiementsChantierDto,
} from './dto/tresorerie.dto';
import type { FinanceUser } from './operations.service';
import { PeriodesFinancieresService } from './periodes.service';
import { PiecesService } from './pieces.service';
import { ficheChantier, numeroOperation } from './tresorerie.calculs';

const PERSONNE = {
  select: { id: true, firstName: true, lastName: true },
} as const;

const INCLUDE_PAIEMENT = {
  recordedBy: PERSONNE,
  validatedBy: PERSONNE,
  echeance: { select: { id: true, ordre: true, libelle: true } },
  projet: { select: { id: true, referenceInterne: true, intitule: true } },
} as const;

type PaiementComplet = Prisma.PaiementChantierGetPayload<{
  include: typeof INCLUDE_PAIEMENT;
}>;

const jourDe = (valeur: string): Date =>
  new Date(`${valeur.slice(0, 10)}T00:00:00.000Z`);

const nomClient = (
  c?: { nom?: string | null; prenom?: string | null } | null,
) => [c?.prenom, c?.nom].filter(Boolean).join(' ').trim() || null;

/**
 * Fiche financière indépendante de chaque chantier : prix, budget, échéancier
 * du client (acompte d'environ 50 %, puis paiements selon l'avancement),
 * recettes confirmées, coût réel, marges prévisionnelle et réelle. Les achats
 * que le client règle lui-même sont suivis à part et ne comptent jamais comme
 * une sortie de trésorerie de MTM.
 */
@Injectable()
export class ChantiersFinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly periodes: PeriodesFinancieresService,
    private readonly pieces: PiecesService,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationsService,
  ) {}

  async fiche(projetId: string) {
    const projet = await this.prisma.projetConstruction.findUnique({
      where: { id: projetId },
      select: {
        id: true,
        referenceInterne: true,
        intitule: true,
        statut: true,
        montantDevis: true,
        budgetPrevu: true,
        avancement: true,
        client: { select: { nom: true, prenom: true } },
        echeancesClient: {
          orderBy: { ordre: 'asc' },
          include: {
            paiements: {
              where: { statut: 'valide' },
              select: { montant: true },
            },
          },
        },
      },
    });
    if (!projet) throw new NotFoundException('Chantier introuvable');

    const [paiements, depenses] = await Promise.all([
      this.prisma.paiementChantier.findMany({
        where: { projetId },
        include: INCLUDE_PAIEMENT,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.depenseChantier.groupBy({
        by: ['poste', 'payeParClient', 'statut'],
        where: { projetId },
        _sum: { montant: true },
      }),
    ]);

    const recettesConfirmees = paiements
      .filter((p) => p.statut === 'valide')
      .reduce((t, p) => t + nombre(p.montant), 0);
    const recettesEnAttente = paiements
      .filter((p) => p.statut === 'en_attente')
      .reduce((t, p) => t + nombre(p.montant), 0);
    const valides = depenses.filter((d) => d.statut === 'valide');
    const coutReel = valides
      .filter((d) => !d.payeParClient)
      .reduce((t, d) => t + nombre(d._sum.montant), 0);
    const achatsClient = valides
      .filter((d) => d.payeParClient)
      .reduce((t, d) => t + nombre(d._sum.montant), 0);
    const depensesEnAttente = depenses
      .filter((d) => d.statut === 'en_attente')
      .reduce((t, d) => t + nombre(d._sum.montant), 0);

    const prixTotal = nombre(projet.montantDevis);
    const budgetPrevu = nombre(projet.budgetPrevu);
    const calcul = ficheChantier({
      prixTotal,
      budgetPrevu,
      avancement: projet.avancement,
      recettesConfirmees,
      recettesEnAttente,
      coutReel,
      achatsClient,
    });

    const parPoste = new Map<string, number>();
    for (const d of valides.filter((x) => !x.payeParClient)) {
      parPoste.set(
        d.poste,
        (parPoste.get(d.poste) ?? 0) + nombre(d._sum.montant),
      );
    }

    return {
      projet: {
        id: projet.id,
        referenceInterne: projet.referenceInterne,
        intitule: projet.intitule,
        statut: projet.statut,
        avancement: projet.avancement,
        client: nomClient(projet.client),
      },
      prixTotal,
      budgetPrevu,
      recettesConfirmees,
      recettesEnAttente,
      coutReel,
      achatsClient,
      depensesEnAttente,
      ...calcul,
      depensesParPoste: [...parPoste.entries()]
        .map(([poste, montant]) => ({ poste, montant }))
        .sort((a, b) => b.montant - a.montant),
      echeances: projet.echeancesClient.map((e) => {
        const paye = e.paiements.reduce((t, p) => t + nombre(p.montant), 0);
        const prevu = nombre(e.montantPrevu);
        return {
          id: e.id,
          ordre: e.ordre,
          libelle: e.libelle,
          dateEcheance: e.dateEcheance,
          montantPrevu: prevu,
          montantPaye: paye,
          reste: Math.max(0, prevu - paye),
          statut: paye >= prevu ? 'payee' : paye > 0 ? 'partielle' : 'a_payer',
        };
      }),
      paiements: paiements.map((p) => this.presenter(p)),
    };
  }

  /**
   * Résultat de chaque chantier : le tableau de bord de la Direction. Une
   * lecture groupée, pas une fiche complète par chantier.
   */
  async rentabilite() {
    const projets = await this.prisma.projetConstruction.findMany({
      where: { statut: { not: 'abandonne' } },
      select: {
        id: true,
        referenceInterne: true,
        intitule: true,
        statut: true,
        montantDevis: true,
        budgetPrevu: true,
        avancement: true,
        client: { select: { nom: true, prenom: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const ids = projets.map((p) => p.id);
    const [recettes, depenses] = await Promise.all([
      this.prisma.paiementChantier.groupBy({
        by: ['projetId', 'statut'],
        where: { projetId: { in: ids } },
        _sum: { montant: true },
      }),
      this.prisma.depenseChantier.groupBy({
        by: ['projetId', 'payeParClient'],
        where: { projetId: { in: ids }, statut: 'valide' },
        _sum: { montant: true },
      }),
    ]);
    return projets.map((p) => {
      const recettesConfirmees = recettes
        .filter((r) => r.projetId === p.id && r.statut === 'valide')
        .reduce((t, r) => t + nombre(r._sum.montant), 0);
      const recettesEnAttente = recettes
        .filter((r) => r.projetId === p.id && r.statut === 'en_attente')
        .reduce((t, r) => t + nombre(r._sum.montant), 0);
      const coutReel = depenses
        .filter((d) => d.projetId === p.id && !d.payeParClient)
        .reduce((t, d) => t + nombre(d._sum.montant), 0);
      const achatsClient = depenses
        .filter((d) => d.projetId === p.id && d.payeParClient)
        .reduce((t, d) => t + nombre(d._sum.montant), 0);
      const prixTotal = nombre(p.montantDevis);
      const budgetPrevu = nombre(p.budgetPrevu);
      return {
        id: p.id,
        referenceInterne: p.referenceInterne,
        intitule: p.intitule,
        statut: p.statut,
        avancement: p.avancement,
        client: nomClient(p.client),
        prixTotal,
        budgetPrevu,
        recettesConfirmees,
        coutReel,
        achatsClient,
        ...ficheChantier({
          prixTotal,
          budgetPrevu,
          avancement: p.avancement,
          recettesConfirmees,
          recettesEnAttente,
          coutReel,
          achatsClient,
        }),
      };
    });
  }

  // ------------------------------------------------------------------
  // Échéancier du client
  // ------------------------------------------------------------------

  async definirEcheances(projetId: string, dto: DefinirEcheancesDto) {
    const projet = await this.prisma.projetConstruction.findUnique({
      where: { id: projetId },
      select: { id: true, montantDevis: true },
    });
    if (!projet) throw new NotFoundException('Chantier introuvable');
    const rattaches = await this.prisma.paiementChantier.count({
      where: { projetId, echeanceId: { not: null } },
    });
    if (rattaches > 0) {
      throw new ConflictException(
        'Des paiements sont déjà rattachés à l’échéancier : il ne se refait plus',
      );
    }
    const total = dto.echeances.reduce((t, e) => t + e.montantPrevu, 0);
    const prix = nombre(projet.montantDevis);
    if (prix > 0 && total > prix) {
      throw new BadRequestException(
        `L’échéancier (${total.toLocaleString('fr-FR')} FCFA) dépasse le prix du chantier (${prix.toLocaleString('fr-FR')} FCFA)`,
      );
    }
    await this.prisma.$transaction([
      this.prisma.echeanceChantier.deleteMany({ where: { projetId } }),
      this.prisma.echeanceChantier.createMany({
        data: dto.echeances.map((e, index) => ({
          projetId,
          ordre: index + 1,
          libelle: e.libelle.trim(),
          dateEcheance: e.dateEcheance ? jourDe(e.dateEcheance) : null,
          montantPrevu: e.montantPrevu,
        })),
      }),
    ]);
    return this.fiche(projetId);
  }

  // ------------------------------------------------------------------
  // Paiements du client
  // ------------------------------------------------------------------

  async listerPaiements(query: QueryPaiementsChantierDto) {
    const where: Prisma.PaiementChantierWhereInput = query.statut
      ? { statut: query.statut }
      : {};
    const [total, items] = await Promise.all([
      this.prisma.paiementChantier.count({ where }),
      this.prisma.paiementChantier.findMany({
        where,
        include: INCLUDE_PAIEMENT,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      items: items.map((p) => this.presenter(p)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async enregistrerPaiement(
    projetId: string,
    dto: CreatePaiementChantierDto,
    user: FinanceUser,
  ) {
    const projet = await this.prisma.projetConstruction.findUnique({
      where: { id: projetId },
      select: { id: true, referenceInterne: true },
    });
    if (!projet) throw new NotFoundException('Chantier introuvable');
    const date = jourDe(dto.date);
    if (date.getTime() > Date.now() + 24 * 3600 * 1000) {
      throw new BadRequestException(
        'La date du paiement ne peut pas être dans le futur',
      );
    }
    await this.periodes.assertOuverte(date);
    if (dto.echeanceId) {
      const echeance = await this.prisma.echeanceChantier.findFirst({
        where: { id: dto.echeanceId, projetId },
        select: { id: true },
      });
      if (!echeance) {
        throw new BadRequestException(
          'Cette échéance n’appartient pas à ce chantier',
        );
      }
    }
    const paiement = await this.prisma.paiementChantier.create({
      data: {
        projetId,
        echeanceId: dto.echeanceId ?? null,
        montant: dto.montant,
        date,
        mode: dto.mode.trim(),
        reference: dto.reference?.trim() || null,
        notes: dto.notes?.trim() || null,
        recordedById: user.id,
      },
      include: INCLUDE_PAIEMENT,
    });
    await this.notifications.alerter(
      'finances:valider',
      {
        type: 'paiement_chantier_a_valider',
        titre: `Paiement client à valider — chantier ${projet.referenceInterne}`,
        message: `${dto.montant.toLocaleString('fr-FR')} FCFA (${dto.mode})`,
        lien: `/finances/chantiers`,
        entityType: 'PaiementChantier',
        entityId: paiement.id,
        dedupeKey: `paiement-chantier:${paiement.id}`,
      },
      user.id,
    );
    return this.presenter(paiement);
  }

  async validerPaiement(id: string, user: FinanceUser) {
    const paiement = await this.chargerPaiement(id);
    if (paiement.statut !== 'en_attente') {
      throw new ConflictException('Ce paiement n’est plus en attente');
    }
    const deuxRegards = await this.settings.getBoolean(
      'finances.doubleValidation',
      true,
    );
    if (deuxRegards && paiement.recordedById === user.id) {
      throw new ForbiddenException(
        'Un paiement est validé par une autre personne que celle qui l’a enregistré',
      );
    }
    await this.periodes.assertOuverte(paiement.date);
    const valide = await this.prisma.paiementChantier.update({
      where: { id },
      data: {
        statut: 'valide',
        validatedById: user.id,
        validatedAt: new Date(),
      },
      include: INCLUDE_PAIEMENT,
    });
    return this.presenter(valide);
  }

  async rejeterPaiement(id: string, motif: string, user: FinanceUser) {
    const paiement = await this.chargerPaiement(id);
    if (paiement.statut !== 'en_attente') {
      throw new ConflictException('Ce paiement n’est plus en attente');
    }
    const rejete = await this.prisma.paiementChantier.update({
      where: { id },
      data: {
        statut: 'rejete',
        motifRejet: motif.trim(),
        validatedById: user.id,
        validatedAt: new Date(),
      },
      include: INCLUDE_PAIEMENT,
    });
    await this.notifications.notifier([paiement.recordedById], {
      type: 'paiement_chantier_rejete',
      niveau: 'alerte',
      titre: 'Paiement de chantier rejeté',
      message: motif.trim(),
      lien: '/finances/chantiers',
      entityType: 'PaiementChantier',
      entityId: id,
    });
    return this.presenter(rejete);
  }

  async joindreJustificatif(id: string, file: Express.Multer.File | undefined) {
    const paiement = await this.chargerPaiement(id);
    if (paiement.statut === 'valide') {
      throw new ConflictException(
        'La pièce d’un paiement validé ne se remplace plus',
      );
    }
    const piece = await this.pieces.deposer(file, 'paiements-chantier');
    const misAJour = await this.prisma.paiementChantier.update({
      where: { id },
      data: { justificatifKey: piece.key, justificatifType: piece.type },
      include: INCLUDE_PAIEMENT,
    });
    await this.pieces.retirer(
      paiement.justificatifKey,
      paiement.justificatifType,
    );
    return this.presenter(misAJour);
  }

  private async chargerPaiement(id: string): Promise<PaiementComplet> {
    const paiement = await this.prisma.paiementChantier.findUnique({
      where: { id },
      include: INCLUDE_PAIEMENT,
    });
    if (!paiement) throw new NotFoundException('Paiement introuvable');
    return paiement;
  }

  presenter(paiement: PaiementComplet) {
    const { justificatifKey, justificatifType, ...reste } = paiement;
    return {
      ...reste,
      numero: numeroOperation('PC', paiement.createdAt, paiement.numeroSeq),
      montant: nombre(paiement.montant),
      justificatifUrl: this.pieces.url(justificatifKey, justificatifType),
    };
  }
}
