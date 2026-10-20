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
  CreateRemboursementDto,
  DecisionRemboursementDto,
  PayerDto,
} from './dto/tresorerie.dto';
import type { FinanceUser } from './operations.service';
import { PeriodesFinancieresService } from './periodes.service';
import { PiecesService } from './pieces.service';
import {
  ajouterMois,
  calculRemboursement,
  jourUtc,
  lireReglesDesistement,
  numeroOperation,
  peutAutoriser,
} from './tresorerie.calculs';

const PERSONNE = {
  select: { id: true, firstName: true, lastName: true },
} as const;

const INCLUDE = {
  dossierVente: {
    select: {
      id: true,
      referenceInterne: true,
      prospect: { select: { nom: true, prenom: true } },
      terrain: { select: { id: true, nom: true } },
    },
  },
  createdBy: PERSONNE,
  decisionPar: PERSONNE,
} as const;

type RemboursementComplet = Prisma.DemandeRemboursementGetPayload<{
  include: typeof INCLUDE;
}>;

const jourDe = (valeur: string): Date =>
  new Date(`${valeur.slice(0, 10)}T00:00:00.000Z`);

/**
 * Désistement d'un client : le protocole retient une part de l'avance et
 * rembourse le reste dans un délai. La règle (retenue, délai) se règle dans
 * les paramètres et se fige dans chaque demande ; tant que la clause n'est
 * pas validée juridiquement, une demande peut être instruite mais pas acceptée.
 */
@Injectable()
export class RemboursementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly periodes: PeriodesFinancieresService,
    private readonly pieces: PiecesService,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationsService,
  ) {}

  async regles() {
    return lireReglesDesistement(
      await this.settings.getRawValue('finances.desistement'),
    );
  }

  /** Ce qu'une demande donnerait aujourd'hui : versé, retenue, remboursable, date limite. */
  async simuler(dossierVenteId: string, avance?: number, dateDemande?: string) {
    const regles = await this.regles();
    const dossier = await this.prisma.dossierVente.findUnique({
      where: { id: dossierVenteId },
      select: {
        id: true,
        referenceInterne: true,
        paiements: { where: { statut: 'valide' }, select: { montant: true } },
        reservations: {
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { montantAcompte: true },
        },
      },
    });
    if (!dossier) throw new NotFoundException('Dossier de vente introuvable');
    const verse = dossier.paiements.reduce((t, p) => t + nombre(p.montant), 0);
    const avanceVersee =
      avance ?? nombre(dossier.reservations[0]?.montantAcompte ?? verse);
    const { retenu, rembourse } = calculRemboursement(
      verse,
      avanceVersee,
      regles.retenuePct,
    );
    const demande = dateDemande ? jourDe(dateDemande) : jourUtc(new Date());
    return {
      dossierVenteId,
      reference: dossier.referenceInterne,
      montantVerse: verse,
      avance: Math.min(avanceVersee, verse),
      retenuePct: regles.retenuePct,
      montantRetenu: retenu,
      montantRembourse: rembourse,
      delaiMois: regles.delaiMois,
      dateLimite: ajouterMois(demande, regles.delaiMois),
      regleValidee: regles.validee,
      versionProtocole: regles.version,
    };
  }

  async lister(query: { statut?: string; page: number; pageSize: number }) {
    const where: Prisma.DemandeRemboursementWhereInput = query.statut
      ? { statut: query.statut }
      : {};
    const [total, items] = await Promise.all([
      this.prisma.demandeRemboursement.count({ where }),
      this.prisma.demandeRemboursement.findMany({
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

  async creer(dto: CreateRemboursementDto, user: FinanceUser) {
    const dateDemande = jourDe(dto.dateDemande);
    if (dateDemande.getTime() > Date.now() + 24 * 3600 * 1000) {
      throw new BadRequestException(
        'La date de réception de la demande ne peut pas être dans le futur',
      );
    }
    const ouverte = await this.prisma.demandeRemboursement.count({
      where: {
        dossierVenteId: dto.dossierVenteId,
        statut: { in: ['demandee', 'acceptee'] },
      },
    });
    if (ouverte > 0) {
      throw new ConflictException(
        'Ce dossier a déjà une demande de remboursement en cours',
      );
    }
    const simulation = await this.simuler(
      dto.dossierVenteId,
      dto.avance,
      dto.dateDemande,
    );
    if (simulation.montantVerse <= 0) {
      throw new BadRequestException(
        'Aucun paiement validé sur ce dossier : il n’y a rien à rembourser',
      );
    }
    const demande = await this.prisma.demandeRemboursement.create({
      data: {
        dossierVenteId: dto.dossierVenteId,
        dateDemande,
        montantVerse: simulation.montantVerse,
        retenuePct: simulation.retenuePct,
        montantRetenu: simulation.montantRetenu,
        montantRembourse: simulation.montantRembourse,
        delaiMois: simulation.delaiMois,
        dateLimite: simulation.dateLimite,
        regleValidee: simulation.regleValidee,
        versionProtocole:
          dto.versionProtocole?.trim() || simulation.versionProtocole,
        motif: dto.motif?.trim() || null,
        createdById: user.id,
      },
      include: INCLUDE,
    });
    await this.notifications.alerter(
      'finances:autoriser',
      {
        type: 'remboursement_a_decider',
        titre: 'Désistement : remboursement à décider',
        message:
          `${simulation.montantRembourse.toLocaleString('fr-FR')} FCFA à rembourser (retenue ${simulation.montantRetenu.toLocaleString('fr-FR')} FCFA) — dossier ${simulation.reference ?? ''}`.trim(),
        lien: '/finances/remboursements',
        entityType: 'DemandeRemboursement',
        entityId: demande.id,
        dedupeKey: `remboursement-a-decider:${demande.id}`,
      },
      user.id,
    );
    return this.presenter(demande);
  }

  async decider(id: string, dto: DecisionRemboursementDto, user: FinanceUser) {
    const demande = await this.charger(id);
    if (demande.statut !== 'demandee') {
      throw new ConflictException('Cette demande n’attend plus de décision');
    }
    const delegations = await this.settings.getRawValue('finances.delegations');
    if (
      !peutAutoriser(
        user.permissions,
        delegations,
        user.id,
        nombre(demande.montantRembourse),
      )
    ) {
      throw new ForbiddenException(
        'Seule la Direction (ou un délégué habilité) décide d’un remboursement',
      );
    }
    const regles = await this.regles();
    if (dto.decision === 'acceptee' && !regles.validee) {
      throw new ConflictException(
        'La clause de retenue et le délai de remboursement ne sont pas encore validés juridiquement : validez-les (réglage finances.desistement) avant d’accepter un remboursement',
      );
    }
    const decidee = await this.prisma.demandeRemboursement.update({
      where: { id },
      data: {
        statut: dto.decision,
        decisionMotif: dto.motif.trim(),
        decisionParId: user.id,
        decisionLe: new Date(),
        regleValidee: regles.validee,
      },
      include: INCLUDE,
    });
    await this.notifications.notifier([demande.createdById], {
      type: 'remboursement_decide',
      titre: `Remboursement ${dto.decision === 'acceptee' ? 'accepté' : 'refusé'}`,
      message: dto.motif.trim(),
      lien: '/finances/remboursements',
      entityType: 'DemandeRemboursement',
      entityId: id,
    });
    return this.presenter(decidee);
  }

  async payer(id: string, dto: PayerDto, user: FinanceUser) {
    const demande = await this.charger(id);
    if (demande.statut !== 'acceptee') {
      throw new ConflictException('Seul un remboursement accepté se paie');
    }
    if (!demande.justificatifKey) {
      throw new BadRequestException(
        'Joignez la preuve du paiement avant de l’enregistrer comme payé',
      );
    }
    const date = jourDe(dto.datePaiement);
    if (date.getTime() > Date.now() + 24 * 3600 * 1000) {
      throw new BadRequestException(
        'La date du paiement ne peut pas être dans le futur',
      );
    }
    await this.periodes.assertOuverte(date);
    const paye = await this.prisma.demandeRemboursement.update({
      where: { id },
      data: {
        statut: 'payee',
        modePaiement: dto.modePaiement.trim(),
        reference: dto.reference.trim(),
        datePaiement: date,
      },
      include: INCLUDE,
    });
    void user;
    return this.presenter(paye);
  }

  async joindreJustificatif(id: string, file: Express.Multer.File | undefined) {
    const demande = await this.charger(id);
    if (['payee', 'refusee'].includes(demande.statut)) {
      throw new ConflictException(
        'La pièce d’un remboursement clos ne se remplace plus',
      );
    }
    const piece = await this.pieces.deposer(file, 'remboursements');
    const misAJour = await this.prisma.demandeRemboursement.update({
      where: { id },
      data: { justificatifKey: piece.key, justificatifType: piece.type },
      include: INCLUDE,
    });
    await this.pieces.retirer(
      demande.justificatifKey,
      demande.justificatifType,
    );
    return this.presenter(misAJour);
  }

  private async charger(id: string): Promise<RemboursementComplet> {
    const demande = await this.prisma.demandeRemboursement.findUnique({
      where: { id },
      include: INCLUDE,
    });
    if (!demande) throw new NotFoundException('Demande introuvable');
    return demande;
  }

  presenter(demande: RemboursementComplet) {
    const { justificatifKey, justificatifType, ...reste } = demande;
    const ouverte = ['demandee', 'acceptee'].includes(demande.statut);
    return {
      ...reste,
      numero: numeroOperation('RB', demande.createdAt, demande.numeroSeq),
      montantVerse: nombre(demande.montantVerse),
      retenuePct: nombre(demande.retenuePct),
      montantRetenu: nombre(demande.montantRetenu),
      montantRembourse: nombre(demande.montantRembourse),
      /** Le délai promis au client est dépassé et le remboursement n'est pas payé. */
      enRetard: ouverte && demande.dateLimite.getTime() < Date.now(),
      justificatifUrl: this.pieces.url(justificatifKey, justificatifType),
    };
  }
}
