import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { applyPaymentToEcheances } from './echeances.helper';
import { CreatePaiementDto } from './dto/create-paiement.dto';
import { VentesAccessService, type MandatUser } from './ventes-access.service';
import { VentesWorkflowService } from './ventes-workflow.service';

/**
 * Paiements d'un dossier de vente (section 12 CDC) : enregistrement,
 * validation avec bascule automatique du statut, imputation sur les
 * échéances et calcul du solde.
 */
/** Libellés des statuts pour les messages renvoyés à l'utilisateur. */
const STATUT_LABELS: Record<string, string> = {
  en_cours: 'En cours',
  pre_reserve: 'Pré-réservé',
  reserve: 'Réservé',
  paiement_partiel: 'Paiement partiel',
  solde: 'Soldé',
  annule: 'Annulé',
};

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
          await applyPaymentToEcheances(
            transaction,
            id,
            Number(payment.montant),
          );

          const newStatut =
            dossier.prixVente !== null && paidAfter >= Number(dossier.prixVente)
              ? 'solde'
              : 'paiement_partiel';

          // Un paiement validé engage le client : sur un dossier encore
          // « en cours » ou « pré-réservé », il vaut réservation, et le
          // terrain est bloqué comme lors d'une réservation classique. Le
          // passage vers l'état cible suit alors le chemin reserve → cible.
          const allowedTransitions =
            await this.workflow.getAllowedTransitions();
          // Un dossier déjà « paiement partiel » qui reçoit un nouveau
          // versement reste dans ce statut : ce n'est pas une transition.
          const direct =
            dossier.statut === newStatut ||
            allowedTransitions[dossier.statut]?.includes(newStatut);
          const viaReservation =
            !direct &&
            allowedTransitions[dossier.statut]?.includes('reserve') &&
            allowedTransitions['reserve']?.includes(newStatut);
          if (!direct && !viaReservation) {
            throw new ConflictException(
              `Impossible de valider un paiement sur un dossier « ${
                STATUT_LABELS[dossier.statut] ?? dossier.statut
              } ». Modifiez d'abord le statut du dossier.`,
            );
          }

          await transaction.dossierVente.update({
            where: { id },
            data: { statut: newStatut },
          });

          if (viaReservation && dossier.terrainId) {
            await transaction.terrain.updateMany({
              where: { id: dossier.terrainId, statutCommercial: 'Disponible' },
              data: { statutCommercial: 'Réservé' },
            });
          }

          if (newStatut === 'solde') {
            // La réservation a rempli son rôle : elle n'expire plus.
            await transaction.reservation.updateMany({
              where: { dossierVenteId: id, statut: 'active' },
              data: { statut: 'confirmee' },
            });
          }
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

  async getEcheances(id: string, user: MandatUser): Promise<unknown[]> {
    await this.access.ensureAccessible(id, user);
    return this.prisma.echeancePaiement.findMany({
      where: { dossierVenteId: id },
      orderBy: { numero: 'asc' },
    });
  }
}
