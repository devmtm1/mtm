import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  /** Corps en texte brut — toujours fourni : c'est le repli universel. */
  text: string;
  /** Corps HTML optionnel, dérivé du texte si absent. */
  html?: string;
}

/**
 * Envoi d'e-mails transactionnels (réinitialisation de mot de passe,
 * invitation espace client, notifications internes).
 *
 * Transport SMTP générique : fonctionne avec n'importe quel fournisseur
 * (Brevo, Resend, Mailgun, Gmail Workspace…) sans dépendance à un SDK.
 *
 * Sans configuration SMTP :
 * - en développement/test, le message est journalisé et rien n'est envoyé ;
 * - en production, l'envoi échoue et le service se déclare indisponible
 *   dans /api/health — un mot de passe oublié ou une demande client sans
 *   e-mail est un cul-de-sac fonctionnel qui doit être visible.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;
  private readonly isProduction: boolean;

  constructor(private readonly config: ConfigService) {
    this.isProduction = this.config.get<string>('NODE_ENV') === 'production';
    this.from =
      this.config.get<string>('MAIL_FROM') ??
      'MTM Immobilier <no-reply@mtm-immobilier.sn>';

    const host = this.config.get<string>('SMTP_HOST');
    if (!host) {
      this.transporter = null;
      this.logger.warn(
        this.isProduction
          ? 'SMTP_HOST non défini : aucun e-mail ne sera envoyé (réinitialisation de mot de passe et notifications hors service).'
          : 'SMTP non configuré : les e-mails sont journalisés au lieu d’être envoyés.',
      );
      return;
    }

    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    this.transporter = createTransport({
      host,
      port,
      // 465 = SMTPS implicite ; sinon STARTTLS négocié par nodemailer.
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }

  /**
   * Envoie le message. Ne lève jamais vers l'appelant : un échec d'envoi ne
   * doit pas faire échouer l'action métier (la demande de contact est déjà
   * enregistrée, le jeton de réinitialisation déjà créé). L'échec est
   * journalisé pour remontée par la supervision.
   *
   * Renvoie `true` si le message est effectivement parti.
   */
  async send(message: MailMessage): Promise<boolean> {
    if (!this.transporter) {
      if (this.isProduction) {
        this.logger.error(
          `E-mail non envoyé (SMTP absent) — destinataire : ${message.to}, sujet : ${message.subject}`,
        );
        return false;
      }
      this.logger.log(
        `[DEV] E-mail simulé → ${message.to}\nSujet : ${message.subject}\n${message.text}`,
      );
      return true;
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html ?? this.textToHtml(message.text),
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Échec d’envoi de l’e-mail « ${message.subject} » à ${message.to}`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }

  /** Vérifie la connexion SMTP (utilisé par le contrôle de santé). */
  async verify(): Promise<boolean> {
    if (!this.transporter) return false;
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      this.logger.error('Connexion SMTP impossible', error);
      return false;
    }
  }

  private textToHtml(text: string): string {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const paragraphs = escaped
      .split(/\n{2,}/)
      .map((block) => `<p>${block.replace(/\n/g, '<br />')}</p>`)
      .join('');
    return `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#1F2937">${paragraphs}</div>`;
  }
}
