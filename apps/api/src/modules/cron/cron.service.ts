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

  /**
   * Balayage quotidien à minuit pour repérer les mandats approchant de leur date de fin.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleMandatsEcheances(): Promise<void> {
    this.logger.log('Vérification quotidienne de l\'échéance des mandats...');
    const now = new Date();
    const activeMandats = await this.prisma.mandat.findMany({
      where: {
        statut: 'actif',
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
    this.logger.log(`Alerte mandats : ${countAlerts} mandats proches de l'expiration.`);
  }

  /**
   * Balayage horaire pour vérifier les activités CRM échues ou approchant de l'échéance.
   */
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
        action: isOverdue ? 'crm.activite_en_retard' : 'crm.activite_echeance_proche',
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
}
