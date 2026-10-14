import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Rappels de l'agenda : toutes les cinq minutes, les événements dont le début
 * tombe dans leur délai de rappel préviennent leurs participants et leur
 * organisateur — une seule fois (le rappel est consigné sur l'événement).
 */
@Injectable()
export class AgendaSchedulerService {
  private readonly logger = new Logger(AgendaSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleRappels(): Promise<void> {
    const envoyes = await this.executer();
    if (envoyes > 0)
      this.logger.log(`Agenda : ${envoyes} rappel(s) envoyé(s).`);
  }

  /** Exposé pour être déclenchable à la main et testable. Renvoie le nombre de rappels envoyés. */
  async executer(maintenant: Date = new Date()): Promise<number> {
    // Fenêtre de recherche large (une semaine, le maximum du réglage) ; le tri fin se fait ensuite.
    const candidats = await this.prisma.evenementAgenda.findMany({
      where: {
        statut: 'prevu',
        rappelMinutes: { not: null },
        rappelEnvoyeLe: null,
        debut: {
          gt: maintenant,
          lte: new Date(maintenant.getTime() + 7 * 24 * 3600 * 1000),
        },
      },
      include: { participants: { select: { userId: true } } },
    });

    let envoyes = 0;
    for (const evenement of candidats) {
      const delai = (evenement.rappelMinutes ?? 0) * 60_000;
      if (evenement.debut.getTime() - maintenant.getTime() > delai) continue;
      const heure = evenement.journeeEntiere
        ? 'toute la journée'
        : evenement.debut.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          });
      await this.notifications.notifier(
        [evenement.createurId, ...evenement.participants.map((p) => p.userId)],
        {
          type: 'rappel_evenement',
          titre: `Bientôt : ${evenement.titre}`,
          message: [heure, evenement.lieu].filter(Boolean).join(' — '),
          lien: `/agenda?evenement=${evenement.id}`,
          entityType: 'EvenementAgenda',
          entityId: evenement.id,
          dedupeKey: `rappel:${evenement.id}:${evenement.debut.getTime()}`,
        },
      );
      await this.prisma.evenementAgenda.update({
        where: { id: evenement.id },
        data: { rappelEnvoyeLe: maintenant },
      });
      envoyes += 1;
    }
    return envoyes;
  }
}
