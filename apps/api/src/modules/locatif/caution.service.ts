import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { PrismaTransaction } from '../../database/prisma.service';
import {
  LocatifAccessService,
  type LocatifUser,
} from './locatif-access.service';
import { LocatifOptionsService } from './locatif-options.service';
import {
  calculerEtatCaution,
  deriveCautionStatut,
  type EtatCaution,
} from './locatif-finance.helper';
import { CreateMouvementCautionDto } from './dto/caution.dto';

const mouvementInclude = {
  recordedBy: { select: { id: true, firstName: true, lastName: true } },
};

/**
 * Caution d'un bail (section 15 : « montant initial, date, statut, retenues
 * éventuelles, justification, remboursement et **historique** »).
 *
 * Chaque opération est une ligne d'historique ; les champs `caution*` du bail
 * sont la photo courante, recalculée à partir de ces lignes. Rien ne peut
 * sortir qui n'ait été encaissé : les retenues et remboursements sont bornés
 * par ce que MTM détient réellement.
 */
@Injectable()
export class CautionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: LocatifAccessService,
    private readonly options: LocatifOptionsService,
  ) {}

  async findAll(bailLocatifId: string, user: LocatifUser) {
    await this.access.ensureBailAccessible(bailLocatifId, user);
    const bail = await this.prisma.bailLocatif.findUnique({
      where: { id: bailLocatifId },
      select: { cautionMontant: true },
    });
    if (!bail) throw new NotFoundException('Bail introuvable');
    const [mouvements, etat] = await Promise.all([
      this.prisma.mouvementCaution.findMany({
        where: { bailLocatifId },
        include: mouvementInclude,
        orderBy: { date: 'desc' },
      }),
      calculerEtatCaution(
        this.prisma,
        bailLocatifId,
        Number(bail.cautionMontant ?? 0),
      ),
    ]);
    return { etat, mouvements };
  }

  async enregistrer(
    bailLocatifId: string,
    dto: CreateMouvementCautionDto,
    user: LocatifUser,
  ) {
    await this.access.ensureBailAccessible(bailLocatifId, user);
    await this.options.assertTypeMouvementCaution(dto.type);
    if (dto.type === 'retenue' && !dto.justification?.trim()) {
      throw new BadRequestException(
        'Une retenue sur caution doit être justifiée (section 15)',
      );
    }
    // Rendre une caution est une sortie de trésorerie : la section 24 lui
    // réserve la permission « payer », distincte de « modifier ».
    if (
      dto.type === 'remboursement' &&
      !(user.permissions ?? []).includes('locatif:payer')
    ) {
      throw new ForbiddenException(
        'La restitution de caution demande la permission « payer » de la gestion locative',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      const bail = await transaction.bailLocatif.findUnique({
        where: { id: bailLocatifId },
        select: { id: true, statut: true, cautionMontant: true },
      });
      if (!bail) throw new NotFoundException('Bail introuvable');
      const etat = await calculerEtatCaution(
        transaction,
        bailLocatifId,
        Number(bail.cautionMontant ?? 0),
      );

      this.assertMouvementPossible(dto, bail, etat);

      await transaction.mouvementCaution.create({
        data: {
          bailLocatifId,
          type: dto.type,
          montant: dto.montant,
          date: dto.date ? new Date(dto.date) : undefined,
          justification: dto.justification,
          recordedById: user.id,
        },
      });

      await synchroniserCautionDuBail(transaction, bailLocatifId);
      const [mouvements, etatApres] = await Promise.all([
        transaction.mouvementCaution.findMany({
          where: { bailLocatifId },
          include: mouvementInclude,
          orderBy: { date: 'desc' },
        }),
        calculerEtatCaution(
          transaction,
          bailLocatifId,
          Number(bail.cautionMontant ?? 0),
        ),
      ]);
      return { etat: etatApres, mouvements };
    });
  }

  /**
   * Bornes de bon sens (section 15) : on ne retient ni ne rembourse plus que
   * ce qui est détenu, et on n'encaisse pas une caution sur un bail clôturé.
   */
  private assertMouvementPossible(
    dto: CreateMouvementCautionDto,
    bail: { statut: string; cautionMontant: unknown },
    etat: EtatCaution,
  ): void {
    const clos = ['termine', 'resilie_sans_preavis'].includes(bail.statut);
    if (dto.type === 'versement') {
      if (clos) {
        throw new BadRequestException(
          'Ce bail est clôturé : un versement de caution n’a plus lieu d’être',
        );
      }
      const montantInitial = Number(bail.cautionMontant ?? 0);
      if (montantInitial > 0 && etat.verse + dto.montant > montantInitial) {
        throw new BadRequestException(
          `Le cumul des versements dépasserait la caution prévue au bail (${montantInitial.toLocaleString('fr-FR')} FCFA)`,
        );
      }
      return;
    }
    if (dto.type === 'ajustement') return;
    if (dto.montant > etat.disponible) {
      const libelle =
        dto.type === 'retenue' ? 'La retenue' : 'Le remboursement';
      throw new BadRequestException(
        `${libelle} dépasse la caution encore détenue (${etat.disponible.toLocaleString('fr-FR')} FCFA)`,
      );
    }
  }
}

/**
 * Recale les champs `caution*` du bail sur son historique. Appelé après
 * chaque mouvement et à la clôture, pour que les écrans et le relevé de
 * gestion n'aient pas à rejouer le calcul.
 */
export async function synchroniserCautionDuBail(
  transaction: PrismaTransaction,
  bailLocatifId: string,
): Promise<EtatCaution> {
  const bail = await transaction.bailLocatif.findUniqueOrThrow({
    where: { id: bailLocatifId },
    select: { cautionMontant: true },
  });
  const mouvements = await transaction.mouvementCaution.findMany({
    where: { bailLocatifId },
    orderBy: { date: 'asc' },
  });

  let verse = 0;
  let retenu = 0;
  let rembourse = 0;
  let premierVersement: Date | null = null;
  let dernierRemboursement: Date | null = null;
  const justifications: string[] = [];
  for (const mouvement of mouvements) {
    const montant = Number(mouvement.montant);
    if (mouvement.type === 'versement' || mouvement.type === 'ajustement') {
      verse += montant;
      premierVersement ??= mouvement.date;
    } else if (mouvement.type === 'retenue') {
      retenu += montant;
      if (mouvement.justification) justifications.push(mouvement.justification);
    } else if (mouvement.type === 'remboursement') {
      rembourse += montant;
      dernierRemboursement = mouvement.date;
    }
  }

  const montantInitial = Number(bail.cautionMontant ?? 0);
  const statut = deriveCautionStatut(montantInitial, verse, retenu, rembourse);
  await transaction.bailLocatif.update({
    where: { id: bailLocatifId },
    data: {
      cautionDate: premierVersement,
      cautionStatut: statut,
      cautionRetenue: retenu > 0 ? retenu : null,
      cautionJustification:
        justifications.length > 0 ? justifications.join(' · ') : null,
      cautionRembourseeMontant: rembourse > 0 ? rembourse : null,
      cautionRembourseeLe: dernierRemboursement,
    },
  });

  return {
    montantInitial,
    verse,
    retenu,
    rembourse,
    disponible: verse - retenu - rembourse,
    statut,
  };
}
