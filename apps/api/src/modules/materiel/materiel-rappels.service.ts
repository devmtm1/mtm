import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  DELAI_AVERTISSEMENT_ENTRETIEN_JOURS,
  DELAI_AVERTISSEMENT_GARANTIE_JOURS,
  aujourdhui,
  formaterNumero,
  jour,
} from './materiel.regles';

const JOUR_MS = 86_400_000;

/**
 * Chaque matin, le secrétariat et la Direction sont prévenus des entretiens prévus dans la semaine (ou en retard) et des
 * garanties qui se terminent dans le mois. Un rappel n'est envoyé qu'une fois par échéance : relancer la tâche ne répète rien.
 */
@Injectable()
export class MaterielRappelsService {
  private readonly logger = new Logger(MaterielRappelsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron('0 8 * * *', { timeZone: 'Africa/Dakar' })
  async rappelerChaqueJour(): Promise<void> {
    try {
      const envoyes = await this.rappeler();
      this.logger.log(`Rappels matériel : ${envoyes} notification(s).`);
    } catch (error) {
      this.logger.error(
        `Rappels matériel non envoyés : ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** Renvoie le nombre de rappels envoyés. */
  async rappeler(maintenant: Date = new Date()): Promise<number> {
    const aujourd = aujourdhui(maintenant);
    const entretiens = await this.prisma.materielEntretien.findMany({
      where: {
        statut: 'prevu',
        date: {
          lte: new Date(
            aujourd.getTime() + DELAI_AVERTISSEMENT_ENTRETIEN_JOURS * JOUR_MS,
          ),
        },
        materiel: { statut: { not: 'sorti' } },
      },
      select: {
        id: true,
        date: true,
        description: true,
        materiel: { select: { id: true, numero: true, designation: true } },
      },
      orderBy: { date: 'asc' },
      take: 200,
    });
    let envoyes = 0;
    for (const e of entretiens) {
      const enRetard = e.date.getTime() < aujourd.getTime();
      const n = await this.notifications.notifierPermission(
        'materiel:modifier',
        {
          type: 'materiel_entretien',
          titre: `${enRetard ? 'Entretien en retard' : 'Entretien à prévoir'} — ${formaterNumero(e.materiel.numero)}`,
          message: `${e.materiel.designation} : ${e.description} (prévu le ${jour(e.date)}).`,
          lien: `/materiel/${e.materiel.id}`,
          entityType: 'Materiel',
          entityId: e.materiel.id,
          // Un seul rappel par entretien et par jour d'échéance.
          dedupeKey: `materiel-entretien:${e.id}:${jour(e.date)}`,
        },
      );
      if (n > 0) envoyes++;
    }

    const garanties = await this.prisma.materiel.findMany({
      where: {
        statut: { not: 'sorti' },
        garantieJusqua: {
          gte: aujourd,
          lte: new Date(
            aujourd.getTime() + DELAI_AVERTISSEMENT_GARANTIE_JOURS * JOUR_MS,
          ),
        },
      },
      select: {
        id: true,
        numero: true,
        designation: true,
        garantieJusqua: true,
      },
      take: 200,
    });
    for (const m of garanties) {
      if (!m.garantieJusqua) continue;
      const n = await this.notifications.notifierPermission(
        'materiel:modifier',
        {
          type: 'materiel_garantie',
          titre: `Garantie bientôt terminée — ${formaterNumero(m.numero)}`,
          message: `${m.designation} : garantie jusqu'au ${jour(m.garantieJusqua)}. Un défaut doit être signalé avant.`,
          lien: `/materiel/${m.id}`,
          entityType: 'Materiel',
          entityId: m.id,
          dedupeKey: `materiel-garantie:${m.id}:${jour(m.garantieJusqua)}`,
        },
      );
      if (n > 0) envoyes++;
    }
    return envoyes;
  }
}
