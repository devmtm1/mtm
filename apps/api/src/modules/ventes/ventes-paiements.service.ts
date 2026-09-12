import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreatePaiementDto } from './dto/create-paiement.dto';
import { VentesAccessService, type MandatUser } from './ventes-access.service';
import { VentesWorkflowService } from './ventes-workflow.service';

/**
 * Paiements d'un dossier de vente (section 12 CDC) : enregistrement,
 * validation avec bascule automatique du statut, imputation sur les
 * échéances et calcul du solde.
 */
@Injectable()
export class VentesPaiementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: VentesAccessService,
    private readonly workflow: VentesWorkflowService,
  ) {}

  async createPaiement(id: string, dto: CreatePaiementDto, user: MandatUser) {
    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          await this.access.ensureAccessible(id, user);
          const dossier = await transaction.dossierVente.findUnique({
            where: { id },
            select: { id: true, prixVente: true, statut: true },
          });
          if (!dossier)
            throw new NotFoundException('Dossier de vente introuvable');
          if (['solde', 'annule'].includes(dossier.statut)) {
            throw new ConflictException(
              'Un dossier soldé ou annulé ne peut plus recevoir de paiement.',
            );
          }
          const allowedModes = await this.workflow.getAllowedPaymentModes();
          if (!allowedModes.includes(dto.mode)) {
            throw new BadRequestException(
              `Mode de paiement invalide. Modes autorisés : ${allowedModes.join(', ')}`,
            );
          }
          const total = await transaction.paiement.aggregate({
            where: { dossierVenteId: id, statut: 'valide' },
            _sum: { montant: true },
          });
          const paidBefore = Number(total._sum.montant ?? 0);
          if (
            dossier.prixVente !== null &&
            paidBefore + dto.montant > Number(dossier.prixVente)
          ) {
            throw new BadRequestException(
              'Le total des paiements dépasserait le prix de vente',
            );
          }
          const payment = await transaction.paiement.create({
            data: {
              dossierVenteId: id,
              montant: dto.montant,
              mode: dto.mode,
              datePaiement: dto.datePaiement
                ? new Date(dto.datePaiement)
                : undefined,
              reference: dto.reference,
              justificatifUrl: dto.justificatifUrl,
              notes: dto.notes,
              statut: 'en_attente',
              recordedById: user.id,
            },
          });
          return {
            payment,
            montantPaye: paidBefore,
            soldeRestant:
              dossier.prixVente === null
                ? null
                : Number(dossier.prixVente) - paidBefore,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'Le paiement est en conflit avec une autre opération',
        );
      }
      throw error;
    }
  }

  async validatePaiement(id: string, paymentId: string, user: MandatUser) {
    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          await this.access.ensureAccessible(id, user);
          const payment = await transaction.paiement.findFirst({
            where: { id: paymentId, dossierVenteId: id, statut: 'en_attente' },
          });
          if (!payment)
            throw new NotFoundException('Paiement en attente introuvable');
          const dossier = await transaction.dossierVente.findUnique({
            where: { id },
            select: { prixVente: true, statut: true, terrainId: true },
          });
          if (!dossier)
            throw new NotFoundException('Dossier de vente introuvable');
          const total = await transaction.paiement.aggregate({
            where: { dossierVenteId: id, statut: 'valide' },
            _sum: { montant: true },
          });
          const paidAfter =
            Number(total._sum.montant ?? 0) + Number(payment.montant);
          if (
            dossier.prixVente !== null &&
            paidAfter > Number(dossier.prixVente)
          ) {
            throw new BadRequestException(
              'La validation dépasserait le prix de vente',
            );
          }
          const validated = await transaction.paiement.update({
            where: { id: paymentId },
            data: { statut: 'valide' },
          });
          await this.applyPaymentToEcheances(
            transaction,
            id,
            Number(payment.montant),
          );

          const newStatut =
            dossier.prixVente !== null && paidAfter >= Number(dossier.prixVente)
              ? 'solde'
              : 'paiement_partiel';

          const allowedTransitions =
            await this.workflow.getAllowedTransitions();
          if (!allowedTransitions[dossier.statut]?.includes(newStatut)) {
            throw new ConflictException(
              `Transition impossible : ${dossier.statut} vers ${newStatut}`,
            );
          }

          await transaction.dossierVente.update({
            where: { id },
            data: { statut: newStatut },
          });

          if (newStatut === 'solde' && dossier.terrainId) {
            await transaction.terrain.updateMany({
              where: {
                id: dossier.terrainId,
                statutCommercial: { in: ['Réservé', 'Disponible'] },
              },
              data: { statutCommercial: 'Vendu' },
            });
            await transaction.dossierVente.update({
              where: { id },
              data: { dateVente: new Date() },
            });
          }

          return {
            payment: validated,
            montantPaye: paidAfter,
            soldeRestant:
              dossier.prixVente === null
                ? null
                : Number(dossier.prixVente) - paidAfter,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'La validation du paiement est en conflit avec une autre opération',
        );
      }
      throw error;
    }
  }

  private async applyPaymentToEcheances(
    transaction: Prisma.TransactionClient,
    dossierVenteId: string,
    montant: number,
  ): Promise<void> {
    let montantRestant = montant;
    const echeances = await transaction.echeancePaiement.findMany({
      where: { dossierVenteId },
      orderBy: { numero: 'asc' },
    });

    for (const echeance of echeances) {
      if (montantRestant <= 0) break;
      const restantEcheance =
        Number(echeance.montantPrevu) - Number(echeance.montantPaye);
      if (restantEcheance <= 0) continue;
      const montantAffecte = Math.min(restantEcheance, montantRestant);
      const montantPaye = Number(echeance.montantPaye) + montantAffecte;
      await transaction.echeancePaiement.update({
        where: { id: echeance.id },
        data: {
          montantPaye,
          statut:
            montantPaye >= Number(echeance.montantPrevu)
              ? 'payee'
              : 'partielle',
        },
      });
      montantRestant -= montantAffecte;
    }
  }

  async getEcheances(id: string, user: MandatUser): Promise<unknown[]> {
    await this.access.ensureAccessible(id, user);
    return this.prisma.echeancePaiement.findMany({
      where: { dossierVenteId: id },
      orderBy: { numero: 'asc' },
    });
  }
}
