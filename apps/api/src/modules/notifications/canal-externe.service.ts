import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import {
  type CanalExterne,
  FOURNISSEURS_MESSAGERIE,
  type FournisseurMessagerie,
} from './messagerie/fournisseur';
import {
  type ChoixFournisseur,
  choisirFournisseur,
  creerFournisseurs,
  VARIABLE_FOURNISSEUR,
} from './messagerie/registre';

export type { CanalExterne } from './messagerie/fournisseur';

export interface EnvoiExterne {
  canal: CanalExterne;
  /** Numéro au format international, ex. +221771234567. */
  destinataire: string;
  texte: string;
  notificationId?: string;
}

/**
 * Canaux externes de notification (SMS, WhatsApp) — section 22 du cahier des
 * charges : « lorsque l'intégration est disponible et autorisée ».
 *
 * Ce service **ne connaît aucun prestataire**. Il demande au registre le
 * fournisseur configuré pour le canal, lui confie le message et consigne le
 * résultat. Changer de prestataire ne touche ni ce service, ni les écrans, ni
 * les données : voir `messagerie/fournisseur.ts`.
 */
@Injectable()
export class CanalExterneService {
  private readonly logger = new Logger(CanalExterneService.name);
  private readonly fournisseurs: FournisseurMessagerie[];
  private readonly signales = new Set<string>();

  /** Les fournisseurs peuvent être imposés (tests, branchement d'un prestataire sur mesure). */
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(FOURNISSEURS_MESSAGERIE)
    fournisseurs?: FournisseurMessagerie[],
  ) {
    this.fournisseurs = fournisseurs ?? creerFournisseurs(config);
  }

  /** Nom du fournisseur qui porte ce canal, ou `null` s'il est inactif. */
  fournisseur(canal: CanalExterne): string | null {
    return this.choix(canal).fournisseur?.nom ?? null;
  }

  estConfigure(canal: CanalExterne): boolean {
    return this.fournisseur(canal) !== null;
  }

  etat(): Record<CanalExterne, boolean> {
    return {
      sms: this.estConfigure('sms'),
      whatsapp: this.estConfigure('whatsapp'),
    };
  }

  /** Envoie le message ; ne lève jamais (la notification est déjà créée). Renvoie vrai si le fournisseur a accepté. */
  async envoyer(envoi: EnvoiExterne): Promise<boolean> {
    const { fournisseur } = this.choix(envoi.canal);
    if (!fournisseur) return false;
    let erreur: string | null;
    try {
      erreur = await fournisseur.envoyer({
        canal: envoi.canal,
        destinataire: envoi.destinataire,
        texte: envoi.texte,
      });
    } catch (error) {
      erreur = error instanceof Error ? error.message : String(error);
    }
    await this.consigner(envoi, fournisseur.nom, erreur);
    if (erreur) {
      this.logger.warn(
        `Envoi ${envoi.canal} (${fournisseur.nom}) vers ${masquer(envoi.destinataire)} échoué : ${erreur}`,
      );
    }
    return erreur === null;
  }

  private choix(canal: CanalExterne): ChoixFournisseur {
    const choix = choisirFournisseur(canal, this.config, this.fournisseurs);
    // Un réglage faux ne doit pas passer inaperçu : on le dit une fois dans le journal.
    if (choix.raison === 'inconnu' || choix.raison === 'non_configure') {
      const cle = `${canal}:${choix.raison}`;
      if (!this.signales.has(cle)) {
        this.signales.add(cle);
        this.logger.error(
          choix.raison === 'inconnu'
            ? `${VARIABLE_FOURNISSEUR[canal]} désigne un fournisseur inconnu (${this.fournisseurs.map((f) => f.nom).join(', ')}) : le canal ${canal} reste inactif.`
            : `${VARIABLE_FOURNISSEUR[canal]} désigne un fournisseur dont les identifiants sont incomplets : le canal ${canal} reste inactif.`,
        );
      }
    }
    return choix;
  }

  private async consigner(
    envoi: EnvoiExterne,
    fournisseur: string,
    erreur: string | null,
  ) {
    try {
      await this.prisma.envoiCanal.create({
        data: {
          canal: envoi.canal,
          fournisseur,
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
