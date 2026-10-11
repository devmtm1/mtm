import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  PrismaService,
  type PrismaTransaction,
} from '../../database/prisma.service';
import {
  NotificationsService,
  formaterMontant,
} from '../notifications/notifications.service';
import {
  DemarchesAccessService,
  type DemarchesUser,
} from './demarches-access.service';
import { DemarchesOptionsService } from './demarches-options.service';
import {
  CreatePaiementMissionDto,
  UpdatePaiementMissionDto,
} from './dto/paiement-mission.dto';
import { syntheseReglement } from './mission-paiements';

const paiementInclude = {
  createdBy: { select: { id: true, firstName: true, lastName: true } },
};

type PaiementLu = Prisma.PaiementMissionGetPayload<{
  include: typeof paiementInclude;
}>;

const nombre = (valeur: unknown): number => Number(valeur ?? 0);

const enLignes = (
  paiements: Array<{
    montantEnvoye: unknown;
    frais: unknown;
    montantNet: unknown;
  }>,
) =>
  paiements.map((paiement) => ({
    montantEnvoye: nombre(paiement.montantEnvoye),
    frais: nombre(paiement.frais),
    montantNet: nombre(paiement.montantNet),
  }));

/**
 * Règlements d'une mission. Un client paie souvent en plusieurs fois, et chaque
 * versement porte ses propres frais de transfert : le total réglé, le solde et
 * le statut de règlement se déduisent donc de la liste, jamais d'une saisie.
 */
@Injectable()
export class DemarchesPaiementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: DemarchesAccessService,
    private readonly options: DemarchesOptionsService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Règlements, du plus ancien au plus récent, avec la situation d'ensemble. */
  async findAll(missionId: string, user: DemarchesUser) {
    await this.access.ensureAccessible(missionId, user);
    const [mission, paiements] = await Promise.all([
      this.prisma.missionVerification.findUnique({
        where: { id: missionId },
        select: { montantDevis: true },
      }),
      this.prisma.paiementMission.findMany({
        where: { missionId },
        include: paiementInclude,
        orderBy: { datePaiement: 'asc' },
      }),
    ]);
    if (!mission) throw new NotFoundException('Mission introuvable');
    return {
      paiements,
      synthese: syntheseReglement(
        mission.montantDevis === null ? null : nombre(mission.montantDevis),
        enLignes(paiements),
      ),
    };
  }

  async create(
    missionId: string,
    dto: CreatePaiementMissionDto,
    user: DemarchesUser,
  ) {
    await this.access.ensureAccessible(missionId, user);
    await this.options.assertModePaiement(dto.mode);
    const frais = dto.frais ?? 0;
    this.assertFrais(dto.montantEnvoye, frais);
    await this.assertReferenceLibre(missionId, dto.reference);

    const paiement = await this.prisma.$transaction(async (tx) => {
      const cree = await tx.paiementMission.create({
        data: {
          missionId,
          datePaiement: dto.datePaiement
            ? new Date(dto.datePaiement)
            : new Date(),
          montantEnvoye: dto.montantEnvoye,
          frais,
          montantNet: dto.montantEnvoye - frais,
          mode: dto.mode,
          reference: dto.reference?.trim() || null,
          note: dto.note?.trim() || null,
          createdById: user.id,
        },
        include: paiementInclude,
      });
      await this.recalculer(tx, missionId);
      return cree;
    });

    await this.notifierClient(missionId, paiement);
    return paiement;
  }

  async update(
    missionId: string,
    paiementId: string,
    dto: UpdatePaiementMissionDto,
    user: DemarchesUser,
  ) {
    await this.access.ensureAccessible(missionId, user);
    const existant = await this.trouver(missionId, paiementId);
    await this.options.assertModePaiement(dto.mode);
    const montantEnvoye = dto.montantEnvoye ?? nombre(existant.montantEnvoye);
    const frais = dto.frais ?? nombre(existant.frais);
    this.assertFrais(montantEnvoye, frais);
    if (dto.reference !== undefined) {
      await this.assertReferenceLibre(missionId, dto.reference, paiementId);
    }

    return this.prisma.$transaction(async (tx) => {
      const mis = await tx.paiementMission.update({
        where: { id: paiementId },
        data: {
          ...(dto.datePaiement !== undefined
            ? { datePaiement: new Date(dto.datePaiement) }
            : {}),
          montantEnvoye,
          frais,
          montantNet: montantEnvoye - frais,
          ...(dto.mode !== undefined ? { mode: dto.mode } : {}),
          ...(dto.reference !== undefined
            ? { reference: dto.reference.trim() || null }
            : {}),
          ...(dto.note !== undefined ? { note: dto.note.trim() || null } : {}),
        },
        include: paiementInclude,
      });
      await this.recalculer(tx, missionId);
      return mis;
    });
  }

  async remove(missionId: string, paiementId: string, user: DemarchesUser) {
    await this.access.ensureAccessible(missionId, user);
    const existant = await this.trouver(missionId, paiementId);
    await this.prisma.$transaction(async (tx) => {
      await tx.paiementMission.delete({ where: { id: paiementId } });
      await this.recalculer(tx, missionId);
    });
    return existant;
  }

  /**
   * Remet à jour le total réglé de la mission : les statistiques et l'espace
   * client le lisent sans jointure. `null` quand plus aucun règlement n'existe.
   */
  private async recalculer(tx: PrismaTransaction, missionId: string) {
    const agregat = await tx.paiementMission.aggregate({
      where: { missionId },
      _sum: { montantEnvoye: true },
      _count: true,
    });
    await tx.missionVerification.update({
      where: { id: missionId },
      data: {
        montantPaye: agregat._count ? agregat._sum.montantEnvoye : null,
      },
    });
  }

  private async trouver(missionId: string, paiementId: string) {
    const paiement = await this.prisma.paiementMission.findFirst({
      where: { id: paiementId, missionId },
    });
    if (!paiement) throw new NotFoundException('Règlement introuvable');
    return paiement;
  }

  private assertFrais(montantEnvoye: number, frais: number): void {
    if (frais > montantEnvoye) {
      throw new BadRequestException(
        'Les frais ne peuvent pas dépasser le montant envoyé',
      );
    }
  }

  /**
   * Un identifiant de transaction ne sert qu'une fois par mission : le saisir
   * deux fois fausserait le total réglé sans qu'on s'en aperçoive.
   */
  private async assertReferenceLibre(
    missionId: string,
    reference: string | undefined,
    sauf?: string,
  ): Promise<void> {
    const valeur = reference?.trim();
    if (!valeur) return;
    const doublon = await this.prisma.paiementMission.findFirst({
      where: {
        missionId,
        reference: { equals: valeur, mode: 'insensitive' },
        ...(sauf ? { id: { not: sauf } } : {}),
      },
      select: { id: true },
    });
    if (doublon) {
      throw new ConflictException(
        `La transaction « ${valeur} » est déjà enregistrée sur cette mission`,
      );
    }
  }

  /** Prévient le client, dans son espace, qu'un règlement vient d'être enregistré. */
  private async notifierClient(
    missionId: string,
    paiement: PaiementLu,
  ): Promise<void> {
    const mission = await this.prisma.missionVerification.findUnique({
      where: { id: missionId },
      select: {
        prospectId: true,
        referenceInterne: true,
        montantDevis: true,
        visibleClient: true,
        paiements: {
          select: { montantEnvoye: true, frais: true, montantNet: true },
        },
      },
    });
    if (!mission?.visibleClient) return;
    const situation = syntheseReglement(
      mission.montantDevis === null ? null : nombre(mission.montantDevis),
      enLignes(mission.paiements),
    );
    const reste =
      situation.statut === 'solde'
        ? ' Votre mission est entièrement réglée.'
        : situation.solde
          ? ` Reste à régler : ${formaterMontant(situation.solde)}.`
          : '';
    await this.notifications.notifierClient(
      { prospectId: mission.prospectId },
      {
        type: 'paiement_valide',
        titre:
          situation.statut === 'solde' ? 'Mission soldée' : 'Règlement reçu',
        message: `${formaterMontant(nombre(paiement.montantEnvoye))} reçus${
          mission.referenceInterne ? ` pour ${mission.referenceInterne}` : ''
        }.${reste}`,
        lien: '/espace-client/verifications',
        entityType: 'PaiementMission',
        entityId: paiement.id,
        dedupeKey: `paiement-mission:${paiement.id}`,
      },
    );
  }
}
