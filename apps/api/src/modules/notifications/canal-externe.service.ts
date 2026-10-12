import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

export type CanalExterne = 'sms' | 'whatsapp';

export interface EnvoiExterne {
  canal: CanalExterne;
  /** Numéro au format international, ex. +221771234567. */
  destinataire: string;
  texte: string;
  notificationId?: string;
}

/** Variables d'environnement de chaque canal : une passerelle HTTP qui reçoit {canal, to, text}. */
const VARIABLES: Record<CanalExterne, { url: string; jeton: string }> = {
  sms: { url: 'SMS_WEBHOOK_URL', jeton: 'SMS_WEBHOOK_TOKEN' },
  whatsapp: { url: 'WHATSAPP_WEBHOOK_URL', jeton: 'WHATSAPP_WEBHOOK_TOKEN' },
};

/**
 * Canaux externes de notification (SMS, WhatsApp) — section 22 du cahier des
 * charges : « lorsque l'intégration est disponible et autorisée ». Le choix du
 * prestataire appartient à MTM : tant qu'aucune passerelle n'est renseignée, le
 * canal est inactif et rien ne part. Une passerelle (ou un petit relais vers le
 * prestataire retenu) reçoit un POST JSON `{ canal, to, text }` ; chaque envoi
 * est consigné, réussi ou non.
 */
@Injectable()
export class CanalExterneService {
  private readonly logger = new Logger(CanalExterneService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  estConfigure(canal: CanalExterne): boolean {
    return Boolean(this.config.get<string>(VARIABLES[canal].url));
  }

  etat(): Record<CanalExterne, boolean> {
    return {
      sms: this.estConfigure('sms'),
      whatsapp: this.estConfigure('whatsapp'),
    };
  }

  /** Envoie le message ; ne lève jamais (la notification est déjà créée). Renvoie vrai si la passerelle a accepté. */
  async envoyer(envoi: EnvoiExterne): Promise<boolean> {
    const variables = VARIABLES[envoi.canal];
    const url = this.config.get<string>(variables.url);
    if (!url) return false;
    let erreur: string | null = null;
    try {
      const jeton = this.config.get<string>(variables.jeton);
      const reponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}),
        },
        body: JSON.stringify({
          canal: envoi.canal,
          to: envoi.destinataire,
          text: envoi.texte.slice(0, 480),
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!reponse.ok) erreur = `La passerelle a répondu ${reponse.status}`;
    } catch (error) {
      erreur = error instanceof Error ? error.message : String(error);
    }
    await this.consigner(envoi, erreur);
    if (erreur) {
      this.logger.warn(
        `Envoi ${envoi.canal} vers ${masquer(envoi.destinataire)} échoué : ${erreur}`,
      );
    }
    return erreur === null;
  }

  private async consigner(envoi: EnvoiExterne, erreur: string | null) {
    try {
      await this.prisma.envoiCanal.create({
        data: {
          canal: envoi.canal,
          destinataire: masquer(envoi.destinataire),
          notificationId: envoi.notificationId,
          statut: erreur ? 'echec' : 'envoye',
          erreur: erreur?.slice(0, 300),
        },
      });
    } catch (error) {
      this.logger.warn(
        `Journal d’envoi non écrit : ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

/** « +221 77 123 45 67 » → « +22177••••67 » : le journal prouve l'envoi sans stocker le numéro entier. */
export function masquer(numero: string): string {
  const chiffres = numero.replace(/\s+/g, '');
  if (chiffres.length <= 6) return '••••';
  return `${chiffres.slice(0, 6)}••••${chiffres.slice(-2)}`;
}
