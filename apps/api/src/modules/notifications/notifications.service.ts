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

/** « 325 000 FCFA » : espace insécable ordinaire entre les milliers, lisible partout. */
export function formaterMontant(valeur: number): string {
  return `${Math.round(valeur)
    .toLocaleString('fr-FR')
    .replace(/\u202f/g, '\u00a0')} FCFA`;
}

/** À qui s'adresse une notification d'espace client : le compte rattaché à… */
export interface CibleClient {
  /** Acheteur (prospect converti en client). */
  prospectId?: string | null;
  locataireId?: string | null;
  proprietaireId?: string | null;
  /** Adresse e-mail du client : retrouve son compte à partir d'une demande déposée sans compte. */
  email?: string | null;
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
   * Comptes d'espace client actifs correspondant à la cible. Une cible vide ou
   * sans compte rattaché ne donne personne : ce n'est pas une erreur, tout client
   * n'a pas encore ouvert son espace.
   */
  async userIdsClient(cible: CibleClient): Promise<string[]> {
    const criteres: Prisma.UserWhereInput[] = [];
    if (cible.prospectId) criteres.push({ clientProspectId: cible.prospectId });
    if (cible.locataireId)
      criteres.push({ clientLocataireId: cible.locataireId });
    if (cible.proprietaireId)
      criteres.push({ clientProprietaireId: cible.proprietaireId });
    if (cible.email)
      criteres.push({
        clientProspect: { email: { equals: cible.email, mode: 'insensitive' } },
      });
    if (criteres.length === 0) return [];
    const users = await this.prisma.user.findMany({
      where: { isActive: true, OR: criteres },
      select: { id: true },
    });
    return (users ?? []).map((user) => user.id);
  }

  /**
   * Notifie le client dans son espace. `input.lien` est alors une route de
   * l'espace client (ex. `/espace-client/dossiers`), pas du back-office. Ne
   * lève jamais : l'opération métier qui l'a déclenchée est déjà faite.
   */
  async notifierClient(
    cible: CibleClient,
    input: NotifierInput,
  ): Promise<number> {
    try {
      return await this.notifier(await this.userIdsClient(cible), input);
    } catch (error) {
      this.logger.error(
        `Notification client « ${input.type} » non créée : ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return 0;
    }
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
