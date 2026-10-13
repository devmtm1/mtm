import type { ConfigService } from '@nestjs/config';
import type {
  CanalExterne,
  FournisseurMessagerie,
  MessageExterne,
} from './fournisseur';

const VARIABLES: Record<CanalExterne, { url: string; jeton: string }> = {
  sms: { url: 'SMS_WEBHOOK_URL', jeton: 'SMS_WEBHOOK_TOKEN' },
  whatsapp: { url: 'WHATSAPP_WEBHOOK_URL', jeton: 'WHATSAPP_WEBHOOK_TOKEN' },
};

/**
 * Adaptateur universel : une **passerelle HTTP** qui reçoit
 * `POST { canal, to, text }` et répond 2xx. Il permet de brancher n'importe quel
 * prestataire (Orange, Twilio, Infobip, WhatsApp Cloud API…) derrière un petit
 * relais, sans écrire de code dans l'application.
 */
export class FournisseurPasserelle implements FournisseurMessagerie {
  readonly nom = 'passerelle';

  constructor(private readonly config: ConfigService) {}

  estConfigure(canal: CanalExterne): boolean {
    return Boolean(this.config.get<string>(VARIABLES[canal].url));
  }

  async envoyer(message: MessageExterne): Promise<string | null> {
    const variables = VARIABLES[message.canal];
    const url = this.config.get<string>(variables.url);
    if (!url) return 'Passerelle non configurée';
    const jeton = this.config.get<string>(variables.jeton);
    const reponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}),
      },
      body: JSON.stringify({
        canal: message.canal,
        to: message.destinataire,
        text: message.texte.slice(0, 480),
      }),
      signal: AbortSignal.timeout(8000),
    });
    return reponse.ok ? null : `La passerelle a répondu ${reponse.status}`;
  }
}
