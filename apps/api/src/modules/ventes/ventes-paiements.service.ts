import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  applyPaymentToEcheances,
  reversePaymentFromEcheances,
} from './echeances.helper';
import { CreatePaiementDto } from './dto/create-paiement.dto';
import { RefusePaiementDto } from './dto/refuse-paiement.dto';
import { ReversePaiementDto } from './dto/reverse-paiement.dto';
import { VentesAccessService, type MandatUser } from './ventes-access.service';
import { VentesWorkflowService } from './ventes-workflow.service';
import { NotificationsService } from '../notifications/notifications.service';

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
    private readonly notifications: NotificationsService,
  ) {}

  async createPaiement(id: string, dto: CreatePaiementDto, user: MandatUser) {
    try {
      const resultat = await this.prisma.$transaction(
        async (transaction) => {
          await this.access.ensureAccessible(id, user);
          const dossier = await transaction.dossierVente.findUnique({
            where: { id },
            select: {
              id: true,
              prixVente: true,
              statut: true,
              referenceInterne: true,
            },
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
            referenceDossier: dossier.referenceInterne,
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
      // Hors de la transaction : une notification ne doit ni la retarder ni
      // la faire échouer. Celui qui a saisi le paiement n'est pas prévenu de
      // sa propre saisie.
      const { referenceDossier, ...reponse } = resultat;
      await this.notifications.notifierPermission(
        'ventes:valider',
        {
          type: 'paiement_a_valider',
          titre: `Paiement à valider — dossier ${referenceDossier ?? id}`,
          message: `${Number(reponse.payment.montant).toLocaleString('fr-FR')} FCFA par ${dto.mode}`,
          lien: `/ventes/${id}`,
          entityType: 'Paiement',
          entityId: reponse.payment.id,
          dedupeKey: `paiement-a-valider:${reponse.payment.id}`,
        },
        user.id,
      );
      return reponse;
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

  /**
   * Refus d'un paiement en attente (virement introuvable, justificatif
   * illisible…). Le paiement n'est pas supprimé : il reste au dossier, avec
   * son motif, hors du montant payé. Seul un paiement « en attente » peut
   * être refusé ; un paiement déjà validé a produit des effets (échéances,
   * statut du dossier, terrain) qu'on ne défait pas par un simple refus.
   */
  async refusePaiement(
    id: string,
    paymentId: string,
    dto: RefusePaiementDto,
    user: MandatUser,
  ) {
    await this.access.ensureAccessible(id, user);
    const payment = await this.prisma.paiement.findFirst({
      where: { id: paymentId, dossierVenteId: id },
      select: { id: true, statut: true, notes: true },
    });
    if (!payment) throw new NotFoundException('Paiement introuvable');
    if (payment.statut !== 'en_attente') {
      throw new ConflictException(
        'Seul un paiement en attente peut être refusé.',
      );
    }
    const motif = dto.motif.trim();
    // Mise à jour conditionnelle : deux refus ou un refus concurrent d'une
    // validation ne peuvent pas se marcher dessus.
    const { count } = await this.prisma.paiement.updateMany({
      where: { id: paymentId, statut: 'en_attente' },
      data: {
        statut: 'refuse',
        notes: [payment.notes, `Refusé : ${motif}`].filter(Boolean).join('\n'),
      },
    });
    if (count === 0) {
      throw new ConflictException(
        'Ce paiement vient d’être traité par une autre personne.',
      );
    }
    return { id: paymentId, statut: 'refuse', motif };
  }

  /**
   * Contre-passation d'un paiement **validé** (saisie erronée, paiement rejeté
   * par la banque, remboursement du client). Le paiement n'est jamais
   * supprimé : il passe « annulé » avec son motif, sort du montant payé, et
   * l'échéancier, le statut du dossier et celui du terrain sont recalculés
   * en conséquence. Refusée si une commission a déjà été payée sur ce
   * dossier : il faut d'abord régulariser la commission.
   */
  async reversePaiement(
    id: string,
    paymentId: string,
    dto: ReversePaiementDto,
    user: MandatUser,
  ) {
    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          await this.access.ensureAccessible(id, user);
          const payment = await transaction.paiement.findFirst({
            where: { id: paymentId, dossierVenteId: id, statut: 'valide' },
          });
          if (!payment)
            throw new NotFoundException('Paiement validé introuvable');
          const dossier = await transaction.dossierVente.findUnique({
            where: { id },
            select: {
              statut: true,
              prixVente: true,
              terrainId: true,
              reservations: {
                select: { statut: true },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          });
          if (!dossier)
            throw new NotFoundException('Dossier de vente introuvable');

          const commissionsPayees = await transaction.commissionVente.count({
            where: { dossierVenteId: id, statut: 'payee' },
          });
          if (commissionsPayees > 0) {
            throw new ConflictException(
              'Une commission a déjà été payée sur ce dossier : régularisez-la avant de contre-passer un paiement.',
            );
          }

          const motif = dto.motif.trim();
          const remboursement = dto.remboursement
            ? `remboursé au client${dto.referenceRemboursement ? ` (réf. ${dto.referenceRemboursement})` : ''}`
            : null;
          await transaction.paiement.update({
            where: { id: paymentId },
            data: {
              statut: 'annule',
              notes: [
                payment.notes,
                `Contre-passé : ${motif}${remboursement ? ` — ${remboursement}` : ''}`,
              ]
                .filter(Boolean)
                .join('\n'),
            },
          });
          await reversePaymentFromEcheances(
            transaction,
            id,
            Number(payment.montant),
          );

          const total = await transaction.paiement.aggregate({
            where: { dossierVenteId: id, statut: 'valide' },
            _sum: { montant: true },
          });
          const paidAfter = Number(total._sum.montant ?? 0);
          const prix =
            dossier.prixVente === null ? null : Number(dossier.prixVente);

          let nouveauStatut = dossier.statut;
          if (dossier.statut !== 'annule') {
            const reservee = !['annulee', 'expiree'].includes(
              dossier.reservations[0]?.statut ?? 'annulee',
            );
            if (paidAfter > 0) {
              nouveauStatut =
                prix !== null && paidAfter >= prix
                  ? 'solde'
                  : 'paiement_partiel';
            } else {
              nouveauStatut = reservee ? 'reserve' : 'en_cours';
            }
          }

          if (nouveauStatut !== dossier.statut) {
            await transaction.dossierVente.update({
              where: { id },
              data: {
                statut: nouveauStatut,
                ...(dossier.statut === 'solde' ? { dateVente: null } : {}),
              },
            });
            if (dossier.terrainId) {
              if (dossier.statut === 'solde') {
                // La vente n'est plus conclue : le terrain redevient réservé,
                // ou libre s'il ne reste plus rien d'engagé.
                await transaction.terrain.updateMany({
                  where: {
                    id: dossier.terrainId,
                    statutCommercial: 'Vendu',
                  },
                  data: {
                    statutCommercial:
                      nouveauStatut === 'en_cours' ? 'Disponible' : 'Réservé',
                  },
                });
              } else if (nouveauStatut === 'en_cours') {
                await transaction.terrain.updateMany({
                  where: {
                    id: dossier.terrainId,
                    statutCommercial: 'Réservé',
                  },
                  data: { statutCommercial: 'Disponible' },
                });
              }
            }
          }

          return {
            id: paymentId,
            statut: 'annule',
            motif,
            remboursement: Boolean(dto.remboursement),
            referenceRemboursement: dto.referenceRemboursement ?? null,
            montantPaye: paidAfter,
            soldeRestant: prix === null ? null : prix - paidAfter,
            statutDossier: nouveauStatut,
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
          'La contre-passation est en conflit avec une autre opération',
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
          if (
            payment.recordedById === user.id &&
            (await this.workflow.isValidationParUnAutreRequise())
          ) {
            throw new ForbiddenException(
              'Le paiement doit être validé par une autre personne que celle qui l’a enregistré.',
            );
          }
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
