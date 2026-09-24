import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { PrismaTransaction } from '../../database/prisma.service';
import {
  LocatifAccessService,
  type LocatifUser,
} from './locatif-access.service';
import {
  BAIL_STATUTS_TERMINES,
  LocatifOptionsService,
} from './locatif-options.service';
import {
  deriveEcheanceStatut,
  desimputerPaiementSurEcheances,
  genererEcheances,
  imputerPaiementSurEcheances,
} from './echeance-loyer.helper';
import {
  calculerSoldeBail,
  synchroniserSituationPaiement,
} from './locatif-finance.helper';
import { CreatePaiementLoyerDto, RejetPaiementDto } from './dto/paiement.dto';

const paiementInclude = {
  recordedBy: { select: { id: true, firstName: true, lastName: true } },
  validatedBy: { select: { id: true, firstName: true, lastName: true } },
  echeance: { select: { id: true, periode: true } },
};

/**
 * Encaissement des loyers (section 15 : « avance, normal, partiel,
 * régularisation »).
 *
 * Un versement est saisi en attente puis validé, comme pour les ventes : la
 * permission « valider » de la section 24 est le contrôle des encaissements du
 * comptable. L'imputation sur les échéances n'a lieu qu'à la validation, et
 * une avance qui dépasse les mois déjà générés en crée d'autres plutôt que de
 * perdre la différence.
 */
@Injectable()
export class PaiementsLoyerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: LocatifAccessService,
    private readonly options: LocatifOptionsService,
  ) {}

  async findAll(bailLocatifId: string, user: LocatifUser) {
    await this.access.ensureBailAccessible(bailLocatifId, user);
    return this.prisma.paiementLoyer.findMany({
      where: { bailLocatifId },
      include: paiementInclude,
      orderBy: { datePaiement: 'desc' },
    });
  }

  async create(
    bailLocatifId: string,
    dto: CreatePaiementLoyerDto,
    user: LocatifUser,
  ) {
    await this.access.ensureBailAccessible(bailLocatifId, user);
    await Promise.all([
      this.options.assertTypePaiement(dto.type),
      this.options.assertModePaiement(dto.modePaiement),
    ]);
    const bail = await this.prisma.bailLocatif.findUnique({
      where: { id: bailLocatifId },
      select: { id: true, statut: true },
    });
    if (!bail) throw new NotFoundException('Bail introuvable');
    if (
      BAIL_STATUTS_TERMINES.includes(
        bail.statut as (typeof BAIL_STATUTS_TERMINES)[number],
      ) &&
      dto.type !== 'regularisation'
    ) {
      throw new BadRequestException(
        'Ce bail est clôturé : seule une régularisation peut encore être encaissée',
      );
    }
    if (dto.echeanceId) {
      const echeance = await this.prisma.echeanceLoyer.findFirst({
        where: { id: dto.echeanceId, bailLocatifId },
        select: { id: true, statut: true },
      });
      if (!echeance) {
        throw new BadRequestException(
          'Cette échéance n’appartient pas à ce bail',
        );
      }
      if (echeance.statut === 'annulee') {
        throw new BadRequestException(
          'Cette échéance a été neutralisée à la sortie du locataire',
        );
      }
    }

    return this.prisma.paiementLoyer.create({
      data: {
        bailLocatifId,
        echeanceId: dto.echeanceId,
        type: dto.type,
        montant: dto.montant,
        datePaiement: dto.datePaiement ? new Date(dto.datePaiement) : undefined,
        modePaiement: dto.modePaiement,
        reference: dto.reference,
        notes: dto.notes,
        recordedById: user.id,
      },
      include: paiementInclude,
    });
  }

  /**
   * Validation d'un encaissement (section 24 : permission « valider »).
   * C'est ici, et seulement ici, que le solde bouge.
   */
  async valider(bailLocatifId: string, paiementId: string, user: LocatifUser) {
    await this.access.ensureBailAccessible(bailLocatifId, user);
    const impayeProlongeJours = await this.options.getImpayeProlongeJours();

    return this.enTransaction(async (transaction) => {
      const paiement = await transaction.paiementLoyer.findFirst({
        where: { id: paiementId, bailLocatifId, statut: 'en_attente' },
      });
      if (!paiement) {
        throw new NotFoundException('Encaissement en attente introuvable');
      }
      const bail = await transaction.bailLocatif.findUniqueOrThrow({
        where: { id: bailLocatifId },
        select: {
          id: true,
          loyerMensuel: true,
          jourEcheance: true,
          dateDebut: true,
          dateFin: true,
        },
      });
      const montant = Number(paiement.montant);

      if (paiement.type !== 'regularisation') {
        if (paiement.echeanceId) {
          await this.imputerSurEcheanceCiblee(
            transaction,
            paiement.echeanceId,
            bailLocatifId,
            montant,
          );
        } else {
          await this.imputerEnEtendantLesEcheances(
            transaction,
            {
              bailLocatifId,
              loyerMensuel: Number(bail.loyerMensuel),
              jourEcheance: bail.jourEcheance,
              dateDebut: bail.dateDebut,
              dateFin: bail.dateFin,
            },
            montant,
          );
        }
      }

      const valide = await transaction.paiementLoyer.update({
        where: { id: paiementId },
        data: {
          statut: 'valide',
          validatedById: user.id,
          validatedAt: new Date(),
        },
        include: paiementInclude,
      });
      await synchroniserSituationPaiement(
        transaction,
        bailLocatifId,
        impayeProlongeJours,
      );
      return valide;
    });
  }

  /**
   * Rejet d'un encaissement : refus d'un versement en attente, ou annulation
   * d'un versement validé à tort — auquel cas ce qu'il avait apporté est
   * retiré des échéances pour que le solde reste juste.
   */
  async rejeter(
    bailLocatifId: string,
    paiementId: string,
    dto: RejetPaiementDto,
    user: LocatifUser,
  ) {
    await this.access.ensureBailAccessible(bailLocatifId, user);
    const impayeProlongeJours = await this.options.getImpayeProlongeJours();

    return this.enTransaction(async (transaction) => {
      const paiement = await transaction.paiementLoyer.findFirst({
        where: { id: paiementId, bailLocatifId },
      });
      if (!paiement) throw new NotFoundException('Encaissement introuvable');
      if (paiement.statut === 'rejete') {
        throw new ConflictException('Cet encaissement est déjà rejeté');
      }
      if (paiement.statut === 'valide' && paiement.type !== 'regularisation') {
        await desimputerPaiementSurEcheances(
          transaction,
          bailLocatifId,
          Number(paiement.montant),
        );
      }
      const rejete = await transaction.paiementLoyer.update({
        where: { id: paiementId },
        data: {
          statut: 'rejete',
          validatedById: user.id,
          validatedAt: new Date(),
          notes: [paiement.notes, `Rejet : ${dto.motif}`]
            .filter(Boolean)
            .join('\n'),
        },
        include: paiementInclude,
      });
      await synchroniserSituationPaiement(
        transaction,
        bailLocatifId,
        impayeProlongeJours,
      );
      return rejete;
    });
  }

  async getEcheances(bailLocatifId: string, user: LocatifUser) {
    await this.access.ensureBailAccessible(bailLocatifId, user);
    return this.prisma.echeanceLoyer.findMany({
      where: { bailLocatifId },
      orderBy: { periode: 'asc' },
    });
  }

  /** Solde du bail, tel qu'affiché en fiche et dans les espaces client. */
  async getSolde(bailLocatifId: string, user: LocatifUser) {
    await this.access.ensureBailAccessible(bailLocatifId, user);
    return calculerSoldeBail(this.prisma, bailLocatifId);
  }

  private async imputerSurEcheanceCiblee(
    transaction: PrismaTransaction,
    echeanceId: string,
    bailLocatifId: string,
    montant: number,
  ): Promise<void> {
    const echeance = await transaction.echeanceLoyer.findFirst({
      where: { id: echeanceId, bailLocatifId },
    });
    if (!echeance) {
      throw new BadRequestException(
        'Cette échéance n’appartient pas à ce bail',
      );
    }
    const restant =
      Number(echeance.montantPrevu) - Number(echeance.montantPaye);
    if (montant > restant) {
      throw new BadRequestException(
        `Le montant dépasse ce qui reste dû sur cette échéance (${restant.toLocaleString('fr-FR')} FCFA)`,
      );
    }
    const montantPaye = Number(echeance.montantPaye) + montant;
    await transaction.echeanceLoyer.update({
      where: { id: echeance.id },
      data: {
        montantPaye,
        statut: deriveEcheanceStatut(
          Number(echeance.montantPrevu),
          montantPaye,
          echeance.dateEcheance,
        ),
      },
    });
  }

  /**
   * Impute un versement libre sur les plus anciennes échéances dues. Une
   * avance qui va au-delà des mois déjà générés en fait générer d'autres
   * (cas particulier « avance de loyer » de la section 15) ; si le bail a une
   * fin connue qui ne laisse plus de mois à couvrir, le versement est refusé
   * plutôt que tronqué en silence.
   */
  private async imputerEnEtendantLesEcheances(
    transaction: PrismaTransaction,
    params: {
      bailLocatifId: string;
      loyerMensuel: number;
      jourEcheance: number;
      dateDebut: Date;
      dateFin: Date | null;
    },
    montant: number,
  ): Promise<void> {
    let restant = await imputerPaiementSurEcheances(
      transaction,
      params.bailLocatifId,
      montant,
    );
    if (restant <= 0) return;

    if (params.loyerMensuel > 0) {
      const moisNecessaires = Math.ceil(restant / params.loyerMensuel);
      const generees = await genererEcheances(
        transaction,
        params,
        moisNecessaires,
      );
      if (generees > 0) {
        restant = await imputerPaiementSurEcheances(
          transaction,
          params.bailLocatifId,
          restant,
        );
      }
    }

    if (restant > 0) {
      throw new BadRequestException(
        `Ce versement dépasse de ${restant.toLocaleString('fr-FR')} FCFA tout ce qui peut être dû sur ce bail : corrigez le montant ou enregistrez-le en régularisation`,
      );
    }
  }

  /** Même garde-fou de concurrence que les paiements de vente. */
  private enTransaction<T>(
    operation: (transaction: PrismaTransaction) => Promise<T>,
  ): Promise<T> {
    return this.prisma
      .$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      })
      .catch((error) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034'
        ) {
          throw new ConflictException(
            'Le paiement est en conflit avec une autre opération, réessayez',
          );
        }
        throw error;
      });
  }
}
