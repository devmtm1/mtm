/**
 * Le « port » de la messagerie externe (SMS, WhatsApp).
 *
 * Le reste de l'application ne connaît **aucun prestataire** : il demande
 * d'envoyer un message sur un canal, et le fournisseur choisi par la
 * configuration s'en charge. Changer de fournisseur = changer une variable
 * d'environnement (et fournir ses identifiants) ; ajouter un fournisseur = écrire
 * une classe qui respecte cette interface et l'inscrire dans `registre.ts`.
 * Aucune donnée ni aucun écran ne dépend du prestataire.
 */

export type CanalExterne = 'sms' | 'whatsapp';

/** Jeton d'injection facultatif : permet d'imposer d'autres fournisseurs (tests, prestataire sur mesure). */
export const FOURNISSEURS_MESSAGERIE = Symbol('FOURNISSEURS_MESSAGERIE');

export const CANAUX_EXTERNES: readonly CanalExterne[] = ['sms', 'whatsapp'];

export interface MessageExterne {
  canal: CanalExterne;
  /** Numéro au format international, ex. +221771234567. */
  destinataire: string;
  /** Texte du message, déjà prêt à partir. */
  texte: string;
}

export interface FournisseurMessagerie {
  /** Nom court, minuscules : la valeur de `SMS_PROVIDER` / `WHATSAPP_PROVIDER` qui le désigne. */
  readonly nom: string;

  /** Vrai quand ce fournisseur a tout ce qu'il lui faut (identifiants, expéditeur…) pour ce canal. */
  estConfigure(canal: CanalExterne): boolean;

  /**
   * Envoie le message. Renvoie `null` si le prestataire l'a accepté, sinon une
   * phrase qui explique le refus (elle est consignée telle quelle). Peut aussi
   * lever : l'appelant traite l'exception comme un refus.
   */
  envoyer(message: MessageExterne): Promise<string | null>;
}
