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
};

export const VERIFICATION_STATUS: Record<string, StatusMeaning> = {
  'Non vérifié': { tone: 'neutral', help: 'Aucun contrôle effectué sur les documents.' },
  'En cours': { tone: 'warning', help: 'Vérification administrative ou physique en cours.' },
  Vérifié: { tone: 'success', help: 'Documents et situation contrôlés par MTM.' },
  'À compléter': { tone: 'danger', help: 'Des pièces manquent pour conclure la vérification.' },
};

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
