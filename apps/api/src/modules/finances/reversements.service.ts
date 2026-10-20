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
  AutoriserReversementDto,
  CreateReversementDto,
  PayerDto,
  QueryReversementsDto,
  QuerySituationsDto,
} from './dto/tresorerie.dto';
import type { FinanceUser } from './operations.service';
import { PeriodesFinancieresService } from './periodes.service';
import { PiecesService } from './pieces.service';
import {
  type SituationProprietaire,
  numeroOperation,
  peutAutoriser,
  situationProprietaire,
} from './tresorerie.calculs';

const PERSONNE = {
  select: { id: true, firstName: true, lastName: true },
} as const;

const INCLUDE = {
  proprietaire: PERSONNE,
  dossierVente: {
    select: {
      id: true,
      referenceInterne: true,
      terrain: { select: { id: true, nom: true, referenceInterne: true } },
    },
  },
  createdBy: PERSONNE,
  autorisePar: PERSONNE,
  payePar: PERSONNE,
} as const;

type ReversementComplet = Prisma.ReversementProprietaireGetPayload<{
  include: typeof INCLUDE;
}>;

export interface SituationDossier extends SituationProprietaire {
  dossierVenteId: string;
  reference: string | null;
  statutDossier: string;
  client: string | null;
  terrain: { id: string; nom: string; referenceInterne: string } | null;
  proprietaire: { id: string; nom: string };
  mode: string;
}

const nomComplet = (p?: {
  firstName?: string | null;
  lastName?: string | null;
  prenom?: string | null;
  nom?: string | null;
}): string | null =>
  [p?.firstName ?? p?.prenom, p?.lastName ?? p?.nom]
    .filter(Boolean)
    .join(' ')
    .trim() || null;

/**
 * Reversements aux propriétaires des terrains qu'ils confient à MTM : MTM
 * encaisse d'abord, déduit sa commission contractuelle (fiche du bien), puis
 * reverse ce qui est dû. Le montant exigible suit le mode du contrat. Une
 * avance, avant que le client ait fini de payer, n'existe que sur autorisation
 * expresse de la Direction. Chaque reversement est autorisé, puis payé avec sa
 * preuve ; il n'entre jamais dans le résultat de MTM.
 */
@Injectable()
export class ReversementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly periodes: PeriodesFinancieresService,
    private readonly pieces: PiecesService,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationsService,
  ) {}

  // ------------------------------------------------------------------
  // Situation : encaissé, commission, dû, reversé
  // ------------------------------------------------------------------

  /** Les ventes de terrains confiés : encaissé, commission acquise par MTM, dû et reversé. */
  async situations(query: QuerySituationsDto = {}): Promise<{
    dossiers: SituationDossier[];
    parProprietaire: Array<{
      proprietaireId: string;
      proprietaire: string;
      dossiers: number;
      encaisse: number;
      commissionAcquise: number;
      du: number;
      reverse: number;
      aReverserMaintenant: number;
      soldeRestant: number;
      enCours: number;
    }>;
    totaux: {
      encaisse: number;
      commissionAcquise: number;
      du: number;
      reverse: number;
      aReverserMaintenant: number;
      soldeRestant: number;
      enCours: number;
    };
  }> {
    const dossiers = await this.prisma.dossierVente.findMany({
      where: {
        statut: { not: 'annule' },
        ...(query.dossierVenteId ? { id: query.dossierVenteId } : {}),
        terrain: {
          proprietaireId: query.proprietaireId ?? { not: null },
          produitDirect: false,
          commission: { not: null },
        },
      },
      select: {
        id: true,
        referenceInterne: true,
        prixVente: true,
        statut: true,
        prospect: { select: { nom: true, prenom: true } },
        terrain: {
          select: {
            id: true,
            nom: true,
            referenceInterne: true,
            commission: true,
            proprietaire: PERSONNE,
          },
        },
        mandat: { select: { modeReversement: true } },
        paiements: { where: { statut: 'valide' }, select: { montant: true } },
        reversements: { select: { montant: true, statut: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const situations: SituationDossier[] = [];
    for (const d of dossiers) {
      if (!d.terrain?.proprietaire || !(nombre(d.prixVente) > 0)) continue;
      const mode = d.mandat?.modeReversement ?? 'au_fur_et_a_mesure';
      const situation = situationProprietaire({
        prixVente: nombre(d.prixVente),
        commission: nombre(d.terrain.commission),
        encaisse: d.paiements.reduce((t, p) => t + nombre(p.montant), 0),
        reverse: d.reversements
          .filter((r) => r.statut === 'paye')
          .reduce((t, r) => t + nombre(r.montant), 0),
        enCours: d.reversements
          .filter((r) => r.statut === 'en_attente' || r.statut === 'autorise')
          .reduce((t, r) => t + nombre(r.montant), 0),
        mode,
      });
      situations.push({
        ...situation,
        dossierVenteId: d.id,
        reference: d.referenceInterne,
        statutDossier: d.statut,
        client: nomComplet(d.prospect),
        terrain: {
          id: d.terrain.id,
          nom: d.terrain.nom,
          referenceInterne: d.terrain.referenceInterne,
        },
        proprietaire: {
          id: d.terrain.proprietaire.id,
          nom: nomComplet(d.terrain.proprietaire) ?? '—',
        },
        mode,
      });
    }

    const parProprietaire = new Map<
      string,
      ReturnType<ReversementsService['regrouper']>
    >();
    for (const s of situations) {
      parProprietaire.set(
        s.proprietaire.id,
        this.regrouper(parProprietaire.get(s.proprietaire.id), s),
      );
    }
    const liste = [...parProprietaire.values()].sort(
      (a, b) => b.soldeRestant - a.soldeRestant,
    );
    const totaux = liste.reduce(
      (t, p) => ({
        encaisse: t.encaisse + p.encaisse,
        commissionAcquise: t.commissionAcquise + p.commissionAcquise,
        du: t.du + p.du,
        reverse: t.reverse + p.reverse,
        aReverserMaintenant: t.aReverserMaintenant + p.aReverserMaintenant,
        soldeRestant: t.soldeRestant + p.soldeRestant,
        enCours: t.enCours + p.enCours,
      }),
      {
        encaisse: 0,
        commissionAcquise: 0,
        du: 0,
        reverse: 0,
        aReverserMaintenant: 0,
        soldeRestant: 0,
        enCours: 0,
      },
    );
    return { dossiers: situations, parProprietaire: liste, totaux };
  }

  private regrouper(
    courant:
      | {
          proprietaireId: string;
          proprietaire: string;
          dossiers: number;
          encaisse: number;
          commissionAcquise: number;
          du: number;
          reverse: number;
          aReverserMaintenant: number;
          soldeRestant: number;
          enCours: number;
        }
      | undefined,
    s: SituationDossier,
  ) {
    const base = courant ?? {
      proprietaireId: s.proprietaire.id,
      proprietaire: s.proprietaire.nom,
      dossiers: 0,
      encaisse: 0,
      commissionAcquise: 0,
      du: 0,
      reverse: 0,
      aReverserMaintenant: 0,
      soldeRestant: 0,
      enCours: 0,
    };
    return {
      ...base,
      dossiers: base.dossiers + 1,
      encaisse: base.encaisse + s.encaisse,
      commissionAcquise: base.commissionAcquise + s.commissionAcquise,
      du: base.du + s.du,
      reverse: base.reverse + s.reverse,
      aReverserMaintenant:
        base.aReverserMaintenant + Math.max(0, s.exigible - s.reverse),
      soldeRestant: base.soldeRestant + s.soldeRestant,
      enCours: base.enCours + s.enCours,
    };
  }

  /** La situation d'un dossier, sans compter un reversement donné (qu'on est en train de valider). */
  private async situationDossier(
    dossierVenteId: string,
    sauf?: string,
  ): Promise<SituationDossier> {
    const { dossiers } = await this.situations({ dossierVenteId });
    const situation = dossiers[0];
    if (!situation) {
      throw new BadRequestException(
        'Ce dossier ne concerne pas un terrain confié par un propriétaire (avec une commission de MTM renseignée sur la fiche du bien)',
      );
    }
    if (!sauf) return situation;
    const propre = await this.prisma.reversementProprietaire.findUnique({
      where: { id: sauf },
      select: { montant: true, statut: true },
    });
    if (propre && ['en_attente', 'autorise'].includes(propre.statut)) {
      const montant = nombre(propre.montant);
      return {
        ...situation,
        enCours: Math.max(0, situation.enCours - montant),
        disponibleSansAvance: situation.disponibleSansAvance + montant,
        disponibleAvecAvance: situation.disponibleAvecAvance + montant,
      };
    }
    return situation;
  }

  // ------------------------------------------------------------------
  // Reversements
  // ------------------------------------------------------------------

  async lister(query: QueryReversementsDto) {
    const where: Prisma.ReversementProprietaireWhereInput = {
      ...(query.statut ? { statut: query.statut } : {}),
      ...(query.proprietaireId ? { proprietaireId: query.proprietaireId } : {}),
      ...(query.dossierVenteId ? { dossierVenteId: query.dossierVenteId } : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.reversementProprietaire.count({ where }),
      this.prisma.reversementProprietaire.findMany({
        where,
        include: INCLUDE,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      items: items.map((r) => this.presenter(r)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async creer(dto: CreateReversementDto, user: FinanceUser) {
    const situation = await this.situationDossier(dto.dossierVenteId);
    const type = dto.type ?? 'normal';
    if (type === 'normal' && dto.montant > situation.disponibleSansAvance) {
      throw new BadRequestException(
        situation.mode === 'fin_paiement' && !situation.solde
          ? 'Le contrat prévoit de reverser à la fin du paiement du client : rien n’est exigible avant le solde. Une avance exige l’autorisation expresse de la Direction.'
          : `Ce reversement dépasse ce que MTM a encaissé pour le propriétaire (disponible : ${situation.disponibleSansAvance.toLocaleString('fr-FR')} FCFA). Une avance exige l’autorisation expresse de la Direction.`,
      );
    }
    if (type === 'avance') {
      if (dto.motif.trim().length < 10) {
        throw new BadRequestException(
          'Une avance au propriétaire est exceptionnelle : motivez-la précisément',
        );
      }
      if (dto.montant > situation.disponibleAvecAvance) {
        throw new BadRequestException(
          `Une avance ne dépasse jamais le dû restant (${situation.disponibleAvecAvance.toLocaleString('fr-FR')} FCFA)`,
        );
      }
    }
    const reversement = await this.prisma.reversementProprietaire.create({
      data: {
        proprietaireId: situation.proprietaire.id,
        dossierVenteId: dto.dossierVenteId,
        montant: dto.montant,
        type,
        motif: dto.motif.trim(),
        createdById: user.id,
      },
      include: INCLUDE,
    });
    await this.notifications.alerter(
      'finances:autoriser',
      {
        type: 'reversement_a_autoriser',
        titre: `${type === 'avance' ? 'Avance au propriétaire' : 'Reversement'} à autoriser`,
        message:
          `${dto.montant.toLocaleString('fr-FR')} FCFA à ${situation.proprietaire.nom} — dossier ${situation.reference ?? ''}`.trim(),
        lien: '/finances/reversements',
        entityType: 'ReversementProprietaire',
        entityId: reversement.id,
        dedupeKey: `reversement-a-autoriser:${reversement.id}`,
      },
      user.id,
    );
    return this.presenter(reversement);
  }

  async autoriser(id: string, dto: AutoriserReversementDto, user: FinanceUser) {
    const reversement = await this.charger(id);
    if (reversement.statut !== 'en_attente') {
      throw new ConflictException('Ce reversement n’est plus en attente');
    }
    if (reversement.createdById === user.id) {
      throw new ForbiddenException(
        'On n’autorise pas sa propre demande : une autre personne doit le faire',
      );
    }
    const motif = dto.motif?.trim() || null;
    if (reversement.type === 'avance') {
      // Une avance relève de la Direction elle-même : une délégation ne suffit pas.
      if (!user.permissions.includes('finances:autoriser')) {
        throw new ForbiddenException(
          'Seule la Direction autorise expressément une avance au propriétaire',
        );
      }
      if (!motif) {
        throw new BadRequestException(
          'Une avance doit être autorisée avec un motif',
        );
      }
    } else {
      const delegations = await this.settings.getRawValue(
        'finances.delegations',
      );
      if (
        !peutAutoriser(
          user.permissions,
          delegations,
          user.id,
          nombre(reversement.montant),
        )
      ) {
        throw new ForbiddenException(
          'Votre pouvoir ne couvre pas ce montant : seule la Direction (ou un délégué habilité) autorise',
        );
      }
    }
    // L'encaissé a pu changer depuis la demande (paiement contre-passé…).
    await this.verifierPlafond(reversement);
    const autorise = await this.prisma.reversementProprietaire.update({
      where: { id },
      data: {
        statut: 'autorise',
        autoriseParId: user.id,
        autoriseLe: new Date(),
        motifAutorisation: motif,
      },
      include: INCLUDE,
    });
    await this.notifications.alerter(
      'finances:payer',
      {
        type: 'reversement_autorise',
        titre: 'Reversement autorisé : à payer',
        message: `${nombre(reversement.montant).toLocaleString('fr-FR')} FCFA — ${this.nomProprietaire(reversement)}`,
        lien: '/finances/reversements',
        entityType: 'ReversementProprietaire',
        entityId: id,
        dedupeKey: `reversement-autorise:${id}`,
      },
      user.id,
    );
    return this.presenter(autorise);
  }

  async rejeter(id: string, motif: string, user: FinanceUser) {
    const reversement = await this.charger(id);
    if (!['en_attente', 'autorise'].includes(reversement.statut)) {
      throw new ConflictException('Ce reversement n’est plus en cours');
    }
    const rejete = await this.prisma.reversementProprietaire.update({
      where: { id },
      data: { statut: 'rejete', motifRejet: motif.trim() },
      include: INCLUDE,
    });
    await this.notifications.notifier([reversement.createdById], {
      type: 'reversement_rejete',
      niveau: 'alerte',
      titre: 'Reversement rejeté',
      message: motif.trim(),
      lien: '/finances/reversements',
      entityType: 'ReversementProprietaire',
      entityId: id,
    });
    void user;
    return this.presenter(rejete);
  }

  /** Paiement effectif : exige l'autorisation, la preuve jointe, un mois ouvert et un plafond respecté. */
  async payer(id: string, dto: PayerDto, user: FinanceUser) {
    const reversement = await this.charger(id);
    if (reversement.statut !== 'autorise') {
      throw new ConflictException('Seul un reversement autorisé se paie');
    }
    if (!reversement.justificatifKey) {
      throw new BadRequestException(
        'Joignez la preuve du paiement (reçu de virement, capture vérifiée, bordereau) avant de l’enregistrer comme payé',
      );
    }
    const date = new Date(`${dto.datePaiement.slice(0, 10)}T00:00:00.000Z`);
    if (date.getTime() > Date.now() + 24 * 3600 * 1000) {
      throw new BadRequestException(
        'La date du paiement ne peut pas être dans le futur',
      );
    }
    await this.periodes.assertOuverte(date);
    await this.verifierPlafond(reversement);
    const paye = await this.prisma.reversementProprietaire.update({
      where: { id },
      data: {
        statut: 'paye',
        modePaiement: dto.modePaiement.trim(),
        reference: dto.reference.trim(),
        datePaiement: date,
        payeParId: user.id,
      },
      include: INCLUDE,
    });
    await this.notifications.notifier([reversement.createdById], {
      type: 'reversement_paye',
      titre: 'Reversement payé',
      message: `${nombre(reversement.montant).toLocaleString('fr-FR')} FCFA — ${this.nomProprietaire(reversement)}`,
      lien: '/finances/reversements',
      entityType: 'ReversementProprietaire',
      entityId: id,
    });
    return this.presenter(paye);
  }

  async joindreJustificatif(id: string, file: Express.Multer.File | undefined) {
    const reversement = await this.charger(id);
    if (!['en_attente', 'autorise'].includes(reversement.statut)) {
      throw new ConflictException(
        'La pièce d’un reversement payé ou rejeté ne se remplace plus',
      );
    }
    const piece = await this.pieces.deposer(file, 'reversements');
    const misAJour = await this.prisma.reversementProprietaire.update({
      where: { id },
      data: { justificatifKey: piece.key, justificatifType: piece.type },
      include: INCLUDE,
    });
    await this.pieces.retirer(
      reversement.justificatifKey,
      reversement.justificatifType,
    );
    return this.presenter(misAJour);
  }

  // ------------------------------------------------------------------

  /** Ce reversement tient-il encore dans ce que MTM a encaissé (ou dans le dû, pour une avance) ? */
  private async verifierPlafond(reversement: ReversementComplet) {
    const situation = await this.situationDossier(
      reversement.dossierVenteId,
      reversement.id,
    );
    const plafond =
      reversement.type === 'avance'
        ? situation.disponibleAvecAvance
        : situation.disponibleSansAvance;
    if (nombre(reversement.montant) > plafond) {
      throw new ConflictException(
        `Ce reversement dépasse maintenant ce qui est disponible (${plafond.toLocaleString('fr-FR')} FCFA) : l’encaissé a changé depuis la demande`,
      );
    }
  }

  private nomProprietaire(reversement: ReversementComplet): string {
    return nomComplet(reversement.proprietaire) ?? '—';
  }

  private async charger(id: string): Promise<ReversementComplet> {
    const reversement = await this.prisma.reversementProprietaire.findUnique({
      where: { id },
      include: INCLUDE,
    });
    if (!reversement) throw new NotFoundException('Reversement introuvable');
    return reversement;
  }

  presenter(reversement: ReversementComplet) {
    const { justificatifKey, justificatifType, ...reste } = reversement;
    return {
      ...reste,
      numero: numeroOperation(
        'RP',
        reversement.createdAt,
        reversement.numeroSeq,
      ),
      montant: nombre(reversement.montant),
      justificatifUrl: this.pieces.url(justificatifKey, justificatifType),
    };
  }
}
