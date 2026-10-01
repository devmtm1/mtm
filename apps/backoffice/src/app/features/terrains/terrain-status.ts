/**
 * Lecture métier des statuts d'un terrain : couleur de pastille et phrase
 * d'explication, pour que chaque écran raconte la même chose à l'utilisateur.
 */
export type PillTone = 'neutral' | 'success' | 'warning' | 'danger' | 'primary' | 'info';

export interface StatusMeaning {
  tone: PillTone;
  /** Ce que le statut implique concrètement (affiché en aide). */
  help: string;
}

export const COMMERCIAL_STATUS: Record<string, StatusMeaning> = {
  Brouillon: { tone: 'neutral', help: 'Fiche en préparation : invisible sur le site public.' },
  Disponible: { tone: 'success', help: 'Publié sur le site public et proposé à la vente.' },
  Réservé: { tone: 'warning', help: 'Un dossier de vente est en cours : retiré du site public.' },
  Vendu: { tone: 'primary', help: 'Transaction finalisée : conservé pour l’historique.' },
  Suspendu: { tone: 'danger', help: 'Commercialisation mise en pause (litige, vérification…).' },
};

export const LEGAL_STATUS: Record<string, StatusMeaning> = {
  'Titre foncier': { tone: 'success', help: 'Titre définitif : le niveau de sécurité le plus élevé.' },
  Bail: { tone: 'info', help: 'Bail de l’État : cessible sous conditions.' },
  Délibération: { tone: 'info', help: 'Délibération communale : à transformer en bail ou titre.' },
  Morcellement: { tone: 'info', help: 'Issu d’un morcellement : vérifier la parcelle mère.' },
  'Régularisation en cours': { tone: 'warning', help: 'Situation juridique en cours de régularisation.' },
  'Notification de bail': { tone: 'info', help: 'Bail notifié à l’occupant : à confirmer par l’acte définitif.' },
  Attribution: { tone: 'info', help: 'Terrain attribué : vérifier l’acte d’attribution et les conditions de mise en valeur.' },
};

export const VERIFICATION_STATUS: Record<string, StatusMeaning> = {
  'Non vérifié': { tone: 'neutral', help: 'Aucun contrôle effectué sur les documents.' },
  'En cours': { tone: 'warning', help: 'Vérification administrative ou physique en cours.' },
  Vérifié: { tone: 'success', help: 'Documents et situation contrôlés par MTM.' },
  'À compléter': { tone: 'danger', help: 'Des pièces manquent pour conclure la vérification.' },
};

/**
 * Nature du bien mis en vente. MTM ne vend plus seulement du foncier : le
 * catalogue mêle parcelles nues et biens bâtis, et un commercial doit voir
 * la différence sans ouvrir la fiche.
 */
export const TYPE_BIEN: Record<string, StatusMeaning> = {
  terrain: { tone: 'info', help: 'Parcelle nue : ni surface habitable ni pièces.' },
  villa: { tone: 'primary', help: 'Maison individuelle, typée F1 à F6.' },
  appartement: { tone: 'primary', help: 'Logement dans un immeuble.' },
  studio: { tone: 'primary', help: 'Logement d’une seule pièce principale.' },
  commerce: { tone: 'success', help: 'Local commercial bâti.' },
  bureau: { tone: 'success', help: 'Local professionnel bâti.' },
  autre: { tone: 'neutral', help: 'Autre nature de bien : à décrire dans la fiche.' },
};

/** Libellé lisible d'un type de bien, première lettre en capitale. */
export function typeBienLabel(value: string | null | undefined): string {
  if (!value) return '—';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** État d'un bien bâti, de la livraison neuve au chantier de rénovation. */
export const ETAT_BIEN: Record<string, StatusMeaning> = {
  neuf: { tone: 'success', help: 'Jamais habité ou livré récemment.' },
  bon_etat: { tone: 'primary', help: 'Habitable en l’état, sans travaux.' },
  a_rafraichir: { tone: 'warning', help: 'Peinture et finitions à reprendre.' },
  a_renover: { tone: 'danger', help: 'Travaux lourds à prévoir avant occupation.' },
};

export const ETAT_BIEN_LABELS: Record<string, string> = {
  neuf: 'Neuf',
  bon_etat: 'Bon état',
  a_rafraichir: 'À rafraîchir',
  a_renover: 'À rénover',
};

export function etatBienLabel(value: string | null | undefined): string {
  return (value && ETAT_BIEN_LABELS[value]) || (value ?? '—');
}

/**
 * Usage prévu du sol. Saisi librement jusqu'ici, d'où des doublons de casse
 * en base ; la liste est maintenant fermée et ces libellés la rendent lisible.
 */
export const VOCATION_LABELS: Record<string, string> = {
  habitation: 'Habitation',
  residentiel: 'Résidentiel',
  commercial: 'Commercial',
  agricole: 'Agricole',
  touristique: 'Touristique',
  industriel: 'Industriel',
  mixte: 'Mixte',
  autre: 'Autre',
};

export function vocationLabel(value: string | null | undefined): string {
  if (!value) return '—';
  return VOCATION_LABELS[value] ?? value;
}

export function statusTone(map: Record<string, StatusMeaning>, value: string | null | undefined): PillTone {
  return (value && map[value]?.tone) || 'neutral';
}

export function statusHelp(map: Record<string, StatusMeaning>, value: string | null | undefined): string {
  return (value && map[value]?.help) || '';
}

/** Classe CSS de la pastille partagée (`styles.scss` › .status-pill). */
export function pillClass(map: Record<string, StatusMeaning>, value: string | null | undefined): string {
  const tone = statusTone(map, value);
  return tone === 'neutral' ? 'status-pill' : `status-pill status-pill--${tone}`;
}

/** Un terrain n'est proposé sur le site public que lorsqu'il est « Disponible ». */
export const PUBLIC_STATUS = 'Disponible';

export function isPublished(statutCommercial: string | null | undefined): boolean {
  return statutCommercial === PUBLIC_STATUS;
}
