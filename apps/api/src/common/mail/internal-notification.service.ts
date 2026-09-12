import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from './mail.service';

/**
 * Notifications à l'équipe MTM pour les demandes venant du site public.
 *
 * Sans e-mail, une demande de contact ou de réservation dort dans le
 * back-office jusqu'à ce que quelqu'un pense à y regarder — pour un
 * acheteur de la diaspora, chaque jour sans réponse est un prospect perdu
 * (section 6 du cahier des charges : « réponse rapide »).
 *
 * Destinataire : CONTACT_NOTIFY_EMAIL si défini, sinon le bloc de contenu
 * `contact.email` administré dans le back-office.
 */
@Injectable()
export class InternalNotificationService {
  private readonly logger = new Logger(InternalNotificationService.name);

  constructor(
    private readonly mail: MailService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async notify(subject: string, lines: string[]): Promise<void> {
    const to = await this.resolveRecipient();
    if (!to) {
      this.logger.warn(
        `Notification interne non envoyée (aucun destinataire configuré) : ${subject}`,
      );
      return;
    }
    await this.mail.send({
      to,
      subject: `[MTM] ${subject}`,
      text: lines.filter(Boolean).join('\n'),
    });
  }

  private async resolveRecipient(): Promise<string | null> {
    const configured = this.config.get<string>('CONTACT_NOTIFY_EMAIL');
    if (configured) return configured;
    const block = await this.prisma.contentBlock.findUnique({
      where: { key: 'contact.email' },
      select: { content: true, isActive: true },
    });
    const email = block?.isActive ? block.content.trim() : '';
    return email.includes('@') ? email : null;
  }
}
