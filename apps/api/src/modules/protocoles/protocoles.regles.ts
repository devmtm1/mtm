/**
 * Règles du suivi des protocoles et des signatures (cahier des charges « Suivi des documents et signatures »), sans dépendance :
 * les statuts, les passages autorisés et ce qu'exige chacun. Partagées par le service, l'alerte « paiement sans signature »
 * déclenchée à l'enregistrement d'un paiement et les tests.
 *
 * Règle de gestion essentielle : un protocole préparé ou envoyé n'est JAMAIS considéré comme signé. Le statut « signé par le
 * client » exige le dépôt de la copie signée et la saisie de sa date de réception.
 */

export const STATUTS_PROTOCOLE = [
  'a_preparer',
  'prepare_a_verifier',
  'envoye',
  'en_attente_signature',
  'signe_client',
  'signe_mtm',
  'a_valider_direction',
  'valide',
  'a_corriger',
  'annule',
] as const;
export type StatutProtocole = (typeof STATUTS_PROTOCOLE)[number];

export const LIBELLES_STATUT: Record<StatutProtocole, string> = {
  a_preparer: 'À préparer',
  prepare_a_verifier: 'Préparé – à vérifier',
  envoye: 'Envoyé au client',
  en_attente_signature: 'En attente de signature',
  signe_client: 'Signé par le client',
  signe_mtm: 'Signé par MTM',
  a_valider_direction: 'À valider par la Direction',
  valide: 'Validé / clôturé',
  a_corriger: 'À corriger',
  annule: 'Annulé',
};

export const TYPES_PROTOCOLE = [
  'protocole_accord',
  'contrat',
  'autre',
] as const;
export const MOYENS_ENVOI = [
  'email',
  'whatsapp',
  'main_propre',
  'courrier',
  'autre',
] as const;

/** Types de documents de vente que ce module dépose dans le dossier. */
export const TYPE_DOCUMENT_PREPARE = 'protocole';
export const TYPE_DOCUMENT_SIGNE = 'protocole_signe';
export const TYPES_DOCUMENT_PROTOCOLE = [
  TYPE_DOCUMENT_PREPARE,
  TYPE_DOCUMENT_SIGNE,
];

/** À partir de ces statuts, le client a signé : un paiement n'est alors plus « sans signature ». */
export const STATUTS_SIGNES: readonly StatutProtocole[] = [
  'signe_client',
  'signe_mtm',
  'a_valider_direction',
  'valide',
];

/** Statuts d'un protocole encore « dehors » : envoyé au client, sans retour signé. */
export const STATUTS_EN_ATTENTE_RETOUR: readonly StatutProtocole[] = [
  'envoye',
  'en_attente_signature',
];

/** Statuts d'un protocole qui n'est plus à traiter. */
export const STATUTS_CLOS: readonly StatutProtocole[] = ['valide', 'annule'];

export const TRANSITIONS: Record<StatutProtocole, readonly StatutProtocole[]> =
  {
    a_preparer: ['prepare_a_verifier', 'annule'],
    prepare_a_verifier: ['envoye', 'a_preparer', 'a_corriger', 'annule'],
    envoye: ['en_attente_signature', 'signe_client', 'a_corriger', 'annule'],
    en_attente_signature: ['signe_client', 'a_corriger', 'annule'],
    signe_client: ['signe_mtm', 'a_valider_direction', 'a_corriger'],
    signe_mtm: ['a_valider_direction', 'a_corriger'],
    a_valider_direction: ['valide', 'a_corriger'],
    valide: [],
    a_corriger: ['a_preparer', 'annule'],
    annule: [],
  };

/** Passages réservés à la Direction : le contrôle final n'est pas celui qui a déposé le document. */
export const STATUTS_RESERVES_DIRECTION: readonly StatutProtocole[] = [
  'valide',
];

/** Délai (en jours) au-delà duquel un protocole envoyé sans retour signé est « en retard ». Réglable : `protocoles.delaiRappelJours`. */
export const DELAI_RAPPEL_DEFAUT_JOURS = 7;
export const CLE_DELAI_RAPPEL = 'protocoles.delaiRappelJours';

/**
 * Ce que le client voit de son protocole : une étape simple, jamais les statuts internes (vérification, validation Direction,
 * motifs de correction…). Un protocole annulé n'est pas montré.
 */
export type EtapeClient = 'en_preparation' | 'a_signer' | 'signe' | 'valide';

export function etapeClient(
  statut: string,
  signatureEnLigne = false,
): { etape: EtapeClient; libelle: string; aide: string } | null {
  switch (statut) {
    case 'a_preparer':
    case 'prepare_a_verifier':
    case 'a_corriger':
      return {
        etape: 'en_preparation',
        libelle: 'En préparation',
        aide: 'MTM prépare votre protocole. Vous serez prévenu dès qu’il est prêt à signer.',
      };
    case 'envoye':
    case 'en_attente_signature':
      return {
        etape: 'a_signer',
        libelle: 'À signer',
        aide: signatureEnLigne
          ? 'Votre protocole est prêt. Lisez-le, puis acceptez-le en ligne ou rendez-le signé à votre conseiller.'
          : 'Votre protocole vous a été envoyé. Signez-le et rendez-le à votre conseiller.',
      };
    case 'signe_client':
    case 'signe_mtm':
    case 'a_valider_direction':
      return {
        etape: 'signe',
        libelle: 'Signé, en cours de validation',
        aide: 'Votre copie signée est bien reçue. MTM finalise la validation.',
      };
    case 'valide':
      return {
        etape: 'valide',
        libelle: 'Signé et validé',
        aide: 'Votre protocole est signé et validé par MTM.',
      };
    default:
      return null;
  }
}

/**
 * Date (AAAA-MM-JJ) à partir de laquelle le suivi des signatures s'applique. Les dossiers ouverts avant n'entrent ni dans
 * l'alerte « paiement reçu – signature manquante » ni dans les compteurs « sans signature » et « incomplets » : sans cela, la
 * mise en service ferait remonter d'un coup tout l'historique. La migration fixe ce réglage au jour de la mise en service ;
 * vide ou absent, tous les dossiers sont suivis. Les protocoles saisis restent visibles dans la liste dans tous les cas.
 */
export const CLE_DEBUT_SUIVI = 'protocoles.suiviDepuis';

/**
 * Réglage (booléen, désactivé par défaut) : le client peut accepter son protocole en ligne depuis son espace. C'est une
 * signature électronique simple (nom saisi, date, adresse, empreinte du document) ; sa valeur juridique est à faire valider
 * par le conseil juridique de MTM avant activation (voir docs/PROTOCOLES.md).
 */
export const CLE_SIGNATURE_EN_LIGNE = 'protocoles.signatureEnLigne';

/** Lit le réglage ci-dessus : une date valide, sinon `null` (aucune limite). */
export function lireDebutSuivi(valeur: unknown): Date | null {
  if (typeof valeur !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valeur.trim()))
    return null;
  const date = new Date(`${valeur.trim()}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function estStatut(valeur: string): valeur is StatutProtocole {
  return (STATUTS_PROTOCOLE as readonly string[]).includes(valeur);
}

/** Ce que contient un protocole au moment où l'on veut changer son statut. */
export interface EtatProtocole {
  statut: StatutProtocole;
  documentPrepareId: string | null;
  documentSigneId: string | null;
  dateEnvoi: Date | null;
  moyenEnvoi: string | null;
  dateReceptionSignee: Date | null;
}

/** Ce que l'utilisateur apporte avec la demande de changement. */
export interface DemandeChangement {
  vers: StatutProtocole;
  motif?: string | null;
  /** Valeurs fournies dans la même demande (elles complètent l'état avant contrôle). */
  dateEnvoi?: Date | null;
  moyenEnvoi?: string | null;
  dateReceptionSignee?: Date | null;
  documentSigneId?: string | null;
}

/**
 * Contrôle un changement de statut. Renvoie le message de refus, ou `null` si le passage est permis.
 * `peutValider` : l'utilisateur a la permission de valider (Direction).
 */
export function verifierChangement(
  etat: EtatProtocole,
  demande: DemandeChangement,
  peutValider: boolean,
): string | null {
  const { vers } = demande;
  if (vers === etat.statut) return 'Le protocole est déjà dans ce statut.';
  if (!TRANSITIONS[etat.statut].includes(vers)) {
    return `Passage impossible : « ${LIBELLES_STATUT[etat.statut]} » ne mène pas à « ${LIBELLES_STATUT[vers]} ».`;
  }
  if (STATUTS_RESERVES_DIRECTION.includes(vers) && !peutValider) {
    return 'Seule la Direction peut valider ou clôturer un protocole.';
  }
  if (
    etat.statut === 'a_valider_direction' &&
    vers === 'a_corriger' &&
    !peutValider
  ) {
    return 'Seule la Direction peut demander une correction à ce stade.';
  }
  if (vers === 'prepare_a_verifier' && !etat.documentPrepareId) {
    return 'Déposez d’abord le document préparé.';
  }
  if (vers === 'envoye') {
    if (!(demande.dateEnvoi ?? etat.dateEnvoi))
      return 'Indiquez la date d’envoi au client.';
    if (!(demande.moyenEnvoi ?? etat.moyenEnvoi))
      return 'Indiquez le moyen d’envoi (e-mail, WhatsApp, main propre…).';
  }
  if (vers === 'signe_client') {
    if (!(demande.documentSigneId ?? etat.documentSigneId)) {
      return 'Le statut « signé par le client » exige le dépôt de la copie signée.';
    }
    if (!(demande.dateReceptionSignee ?? etat.dateReceptionSignee)) {
      return 'Indiquez la date de réception de la copie signée.';
    }
  }
  if ((vers === 'a_corriger' || vers === 'annule') && !demande.motif?.trim()) {
    return 'Indiquez le motif.';
  }
  return null;
}

/** Un protocole est « en retard » quand il est parti chez le client depuis plus de `delaiJours` sans retour signé. */
export function estEnRetard(
  protocole: { statut: string; dateEnvoi: Date | null },
  delaiJours: number,
  maintenant: Date = new Date(),
): boolean {
  if (
    !(STATUTS_EN_ATTENTE_RETOUR as readonly string[]).includes(protocole.statut)
  )
    return false;
  if (!protocole.dateEnvoi) return false;
  return (
    maintenant.getTime() - protocole.dateEnvoi.getTime() >
    delaiJours * 86_400_000
  );
}
