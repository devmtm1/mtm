import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleMandatsEcheances(): Promise<void> {
    this.logger.log("Vérification quotidienne de l'échéance des mandats...");
    const now = new Date();
    const activeMandats = await this.prisma.mandat.findMany({
      where: {
        statut: 'Actif',
        dateFin: { gte: now },
      },
      select: {
        id: true,
        referenceInterne: true,
        dateFin: true,
        alerteEcheanceJours: true,
        commercialResponsableId: true,
      },
    });

    let countAlerts = 0;
    for (const mandat of activeMandats) {
      if (!mandat.dateFin) continue;
      const daysUntilExpiry = Math.ceil(
        (mandat.dateFin.getTime() - now.getTime()) / (1000 * 3600 * 24),
      );
      const alertThreshold = mandat.alerteEcheanceJours ?? 30;

      if (daysUntilExpiry <= alertThreshold) {
        const alreadyLogged = await this.prisma.auditLog.findFirst({
          where: {
            action: 'mandat.echeance_imminente',
            entityType: 'Mandat',
            entityId: mandat.id,
            createdAt: {
              gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            },
          },
          select: { id: true },
        });
        if (alreadyLogged) continue;
        countAlerts++;
        await this.audit.record({
          userId: mandat.commercialResponsableId,
          action: 'mandat.echeance_imminente',
          entityType: 'Mandat',
          entityId: mandat.id,
          newValue: {
            referenceInterne: mandat.referenceInterne,
            dateFin: mandat.dateFin,
            daysRemaining: daysUntilExpiry,
          },
        });
      }
    }
    this.logger.log(
      `Alerte mandats : ${countAlerts} mandats proches de l'expiration.`,
    );
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleCrmRelances(): Promise<void> {
    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 3600 * 1000);

    const pendingTasks = await this.prisma.activiteCrm.findMany({
      where: {
        statut: 'a_faire',
        dateEcheance: { lte: next24h },
      },
      include: {
        prospect: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            commercialResponsableId: true,
          },
        },
      },
    });

    for (const task of pendingTasks) {
      const isOverdue = task.dateEcheance && task.dateEcheance < now;
      await this.audit.record({
        userId: task.prospect.commercialResponsableId,
        action: isOverdue
          ? 'crm.activite_en_retard'
          : 'crm.activite_echeance_proche',
        entityType: 'ActiviteCrm',
        entityId: task.id,
        newValue: {
          titre: task.titre,
          dateEcheance: task.dateEcheance,
          prospectId: task.prospectId,
          isOverdue,
        },
      });
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleReservationsExpirees(): Promise<void> {
    const now = new Date();
    const expiredReservations = await this.prisma.reservation.findMany({
      where: {
        statut: { in: ['active', 'prolongee'] },
        dateExpiration: { lte: now },
      },
      select: {
        id: true,
        dossierVenteId: true,
        dossierVente: {
          select: {
            id: true,
            statut: true,
            terrainId: true,
            paiements: {
              where: { statut: 'valide' },
              select: { id: true },
            },
          },
        },
      },
    });

    for (const reservation of expiredReservations) {
      const dossier = reservation.dossierVente;
      if (!dossier) continue;

      const hasValidatedPayments = dossier.paiements.length > 0;
      const isSoldOrPartiallyPaid = ['solde', 'paiement_partiel'].includes(
        dossier.statut,
      );

      if (hasValidatedPayments || isSoldOrPartiallyPaid) {
        await this.audit.record({
          action: 'vente.reservation.expiry_skipped',
          entityType: 'Reservation',
          entityId: reservation.id,
          newValue: {
            dossierVenteId: reservation.dossierVenteId,
            reason: hasValidatedPayments
              ? 'paiements_valides_presents'
              : 'statut_dossier_avance',
          },
        });
        continue;
      }

      await this.prisma.$transaction(async (transaction) => {
        const updated = await transaction.reservation.updateMany({
          where: {
            id: reservation.id,
            statut: { in: ['active', 'prolongee'] },
          },
          data: { statut: 'expiree' },
        });
        if (updated.count !== 1) return;

        await transaction.dossierVente.update({
          where: { id: reservation.dossierVenteId },
          data: { statut: 'annule' },
        });

        if (dossier.terrainId) {
          await transaction.terrain.updateMany({
            where: { id: dossier.terrainId, statutCommercial: 'Réservé' },
            data: { statutCommercial: 'Disponible' },
          });
        }
      });

      await this.audit.record({
        action: 'vente.reservation.expired',
        entityType: 'Reservation',
        entityId: reservation.id,
        newValue: { dossierVenteId: reservation.dossierVenteId },
      });
    }
  }
}
