import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../../common/mail/mail.service';

export interface NotifierInput {
  type: string;
  titre: string;
  message?: string;
  /** Route du back-office, ex. `/ventes/<id>`. */
  lien?: string;
  niveau?: 'info' | 'alerte';
  entityType?: string;
  entityId?: string;
  /**
   * Même clé pour le même destinataire = une seule notification. À utiliser
   * pour toute alerte émise par une tâche planifiée.
   */
  dedupeKey?: string;
  /** Double l'envoi d'un e-mail (en plus de la cloche). */
  email?: boolean;
}

/**
 * Notifications internes (section 22 CDC). L'e-mail n'est qu'un canal de
 * plus : sa panne ne doit jamais faire échouer l'opération métier qui a
 * déclenché la notification.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  /** Utilisateurs actifs titulaires d'une permission, par l'un de leurs rôles. */
  async userIdsWithPermission(permission: string): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        roles: {
          some: {
            role: {
              permissions: { some: { permission: { name: permission } } },
            },
          },
        },
      },
      select: { id: true },
    });
    return users.map((user) => user.id);
  }

  /**
   * Crée la notification pour chaque destinataire et renvoie le nombre de
   * nouvelles notifications (hors doublons). Ne lève jamais : un échec est
   * journalisé.
   */
  async notifier(userIds: string[], input: NotifierInput): Promise<number> {
    const destinataires = [...new Set(userIds.filter(Boolean))];
    let creees = 0;
    for (const userId of destinataires) {
      try {
        const notification = await this.prisma.notification.create({
          data: {
            userId,
            type: input.type,
            niveau: input.niveau ?? 'info',
            titre: input.titre,
            message: input.message,
            lien: input.lien,
            entityType: input.entityType,
            entityId: input.entityId,
            dedupeKey: input.dedupeKey,
          },
          select: { id: true, user: { select: { email: true } } },
        });
        creees += 1;
        if (input.email)
          await this.envoyerEmail(notification.user.email, input);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue; // déjà notifié : c'est le but de la clé de dédoublonnage
        }
        this.logger.error(
          `Notification « ${input.type} » non créée pour ${userId} : ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    return creees;
  }

  /** Notifie tous les titulaires d'une permission, sauf `exclure`. */
  async notifierPermission(
    permission: string,
    input: NotifierInput,
    exclure?: string,
  ): Promise<number> {
    const ids = await this.userIdsWithPermission(permission);
    return this.notifier(
      ids.filter((id) => id !== exclure),
      input,
    );
  }

  async lister(
    userId: string,
    options: { nonLuesSeulement?: boolean; limite?: number },
  ) {
    const limite = Math.min(Math.max(options.limite ?? 30, 1), 100);
    const [items, nonLues] = await Promise.all([
      this.prisma.notification.findMany({
        where: {
          userId,
          ...(options.nonLuesSeulement ? { readAt: null } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limite,
      }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { items, nonLues };
  }

  /** Marque lue une notification du demandeur ; sans effet sur celle d'un autre. */
  async marquerLue(userId: string, id: string): Promise<{ marquees: number }> {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { marquees: count };
  }

  async toutMarquerLu(userId: string): Promise<{ marquees: number }> {
    const { count } = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { marquees: count };
  }

  /** Rétention : les notifications lues depuis plus de `jours` jours sont supprimées. */
  async purgerLues(jours = 90): Promise<number> {
    const limite = new Date(Date.now() - jours * 24 * 3600 * 1000);
    const { count } = await this.prisma.notification.deleteMany({
      where: { readAt: { lt: limite } },
    });
    return count;
  }

  private async envoyerEmail(to: string, input: NotifierInput): Promise<void> {
    try {
      const base = this.config.get<string>('BACKOFFICE_URL') ?? '';
      const lien = input.lien
        ? `${base.replace(/\/$/, '')}${input.lien}`
        : base;
      await this.mail.send({
        to,
        subject: `[MTM] ${input.titre}`,
        text: [input.titre, input.message, lien && `Ouvrir : ${lien}`]
          .filter(Boolean)
          .join('\n\n'),
      });
    } catch (error) {
      this.logger.warn(
        `E-mail de notification non envoyé à ${to} : ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
