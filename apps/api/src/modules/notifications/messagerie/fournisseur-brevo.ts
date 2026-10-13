import type { ConfigService } from '@nestjs/config';
import type {
  CanalExterne,
  FournisseurMessagerie,
  MessageExterne,
} from './fournisseur';

const API = 'https://api.brevo.com/v3';

/** Chiffres seuls, indicatif pays compris : « +221 77 123 45 67 » → « 221771234567 ». Brevo n'accepte ni « + » ni espaces. */
export function numeroBrevo(numero: string): string {
  return numero.replace(/\D/g, '');
}

/**
 * Adaptateur Brevo (SMS transactionnel et WhatsApp). Un fournisseur parmi
 * d'autres : rien d'autre dans l'application n'y fait référence.
 *
 * Variables : `BREVO_API_KEY` (clé d'API v3, distincte de la clé SMTP),
 * `BREVO_SMS_SENDER`, `BREVO_WHATSAPP_SENDER`, `BREVO_WHATSAPP_TEMPLATE_ID`.
 */
export class FournisseurBrevo implements FournisseurMessagerie {
  readonly nom = 'brevo';

  constructor(private readonly config: ConfigService) {}

  estConfigure(canal: CanalExterne): boolean {
    return this.reglages(canal) !== null;
  }

  async envoyer(message: MessageExterne): Promise<string | null> {
    const reglages = this.reglages(message.canal);
    if (!reglages) return 'Brevo n’est pas configuré pour ce canal';
    const numero = numeroBrevo(message.destinataire);

    let chemin: string;
    let corps: Record<string, unknown>;
    if (message.canal === 'sms') {
      chemin = '/transactionalSMS/send';
      corps = {
        sender: reglages.expediteur,
        recipient: numero,
        content: message.texte.slice(0, 480),
        type: 'transactional',
        // Les accents sortent sans encodage Unicode seulement dans l'alphabet SMS :
        // l'option évite des caractères remplacés par « ? ».
        unicodeEnabled: /\P{ASCII}/u.test(message.texte),
        tag: ['mtm-notification'],
      };
    } else {
      chemin = '/whatsapp/sendMessage';
      corps = {
        senderNumber: numeroBrevo(reglages.expediteur),
        contactNumbers: [numero],
        // WhatsApp impose un modèle approuvé pour écrire à quelqu'un qui n'a pas
        // écrit depuis moins de 24 h ; sans modèle, le texte libre ne part que dans
        // une conversation déjà ouverte.
        ...(reglages.modele
          ? { templateId: Number(reglages.modele) }
          : { text: message.texte.slice(0, 480) }),
      };
    }

    const reponse = await fetch(`${API}${chemin}`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': reglages.cle,
      },
      body: JSON.stringify(corps),
      signal: AbortSignal.timeout(10_000),
    });
    if (reponse.ok) return null;
    // Brevo explique le refus (solde épuisé, expéditeur non validé, numéro invalide…).
    let detail = '';
    try {
      const json = (await reponse.json()) as { message?: string };
      detail = json.message ? ` : ${json.message}` : '';
    } catch {
      /* corps absent ou illisible */
    }
    return `Brevo a répondu ${reponse.status}${detail}`.slice(0, 280);
  }

  /** Clé d'API et expéditeur du canal ; `null` tant que l'un des deux manque. */
  private reglages(canal: CanalExterne) {
    const cle = this.config.get<string>('BREVO_API_KEY');
    if (!cle) return null;
    if (canal === 'sms') {
      const expediteur = this.config.get<string>('BREVO_SMS_SENDER');
      return expediteur ? { cle, expediteur, modele: undefined } : null;
    }
    const expediteur = this.config.get<string>('BREVO_WHATSAPP_SENDER');
    return expediteur
      ? {
          cle,
          expediteur,
          modele: this.config.get<number>('BREVO_WHATSAPP_TEMPLATE_ID'),
        }
      : null;
  }
}
