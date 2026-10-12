import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { STATUTS_TACHE_OUVERTS } from './taches.constants';

const UN_JOUR = 24 * 3600 * 1000;

/**
 * Relances des tâches : une échéance qui passe ne produit aucune action
 * utilisateur, il faut donc un passage régulier. Chaque alerte est dédoublonnée
 * (une par jour pour un retard, une seule pour une échéance proche) : relancé
 * toutes les heures, le responsable ne reçoit pas vingt-quatre messages.
 */
@Injectable()
export class TachesSchedulerService {
  private readonly logger = new Logger(TachesSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleRelances(): Promise<void> {
    const bilan = await this.executer();
    if (bilan.enRetard + bilan.echeanceProche > 0) {
      this.logger.log(
        `Tâches : ${bilan.enRetard} en retard, ${bilan.echeanceProche} à rendre sous 24 h.`,
      );
    }
  }

  /** Exposé pour être déclenchable à la main et testable. */
  async executer(maintenant: Date = new Date()) {
    const jour = maintenant.toISOString().slice(0, 10);
    const ouvertes = {
      statut: { in: [...STATUTS_TACHE_OUVERTS] },
      dateLimite: { not: null },
    };

    const enRetard = await this.prisma.tache.findMany({
      where: { ...ouvertes, dateLimite: { lt: maintenant } },
      select: {
        id: true,
        titre: true,
        dateLimite: true,
        responsableId: true,
        creeParId: true,
        entityLabel: true,
      },
    });
    for (const tache of enRetard) {
      // Le responsable est prévenu, et celui qui a confié la tâche aussi.
      await this.notifications.notifier(
        [tache.responsableId, tache.creeParId],
        {
          type: 'tache_en_retard',
          niveau: 'alerte',
          titre: `Tâche en retard : ${tache.titre}`,
          message: [
            tache.entityLabel,
            `Échéance dépassée : ${tache.dateLimite?.toLocaleDateString('fr-FR')}`,
          ]
            .filter(Boolean)
            .join(' — '),
          lien: `/taches?tache=${tache.id}`,
          entityType: 'Tache',
          entityId: tache.id,
          dedupeKey: `tache-retard:${tache.id}:${jour}`,
          email: true,
        },
      );
    }

    const bientot = await this.prisma.tache.findMany({
      where: {
        ...ouvertes,
        dateLimite: {
          gte: maintenant,
          lt: new Date(maintenant.getTime() + UN_JOUR),
        },
      },
      select: { id: true, titre: true, dateLimite: true, responsableId: true },
    });
    for (const tache of bientot) {
      await this.notifications.notifier([tache.responsableId], {
        type: 'tache_echeance',
        titre: `À rendre sous 24 h : ${tache.titre}`,
        lien: `/taches?tache=${tache.id}`,
        entityType: 'Tache',
        entityId: tache.id,
        dedupeKey: `tache-echeance:${tache.id}`,
      });
    }

    return { enRetard: enRetard.length, echeanceProche: bientot.length };
  }
}
