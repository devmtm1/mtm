/**
 * Fréquentation du site public : vocabulaire commun à l'enregistrement (site public) et à la
 * lecture (back-office).
 */

/** `site` : une page vue du site, toutes pages confondues ; les autres : la fiche d'un bien. */
export const TYPES_VISITE = [
  'site',
  'terrain',
  'location',
  'realisation',
  'projet',
] as const;
export type TypeVisite = (typeof TYPES_VISITE)[number];

/** Types dont la cible est l'identifiant d'une fiche. */
export const TYPES_FICHE = [
  'terrain',
  'location',
  'realisation',
  'projet',
] as const;
export type TypeFiche = (typeof TYPES_FICHE)[number];

export const SOURCES_VISITE = [
  'direct',
  'google',
  'facebook',
  'instagram',
  'whatsapp',
  'tiktok',
  'youtube',
  'autre',
] as const;
export type SourceVisite = (typeof SOURCES_VISITE)[number];

/** Période demandée, en jours : toute autre valeur est ramenée à la plus proche. */
export const PERIODES_JOURS = [7, 30, 90] as const;

export interface PointSerie {
  /** AAAA-MM-JJ */
  jour: string;
  visites: number;
  pagesVues: number;
}

export interface LigneBien {
  type: TypeFiche;
  id: string;
  titre: string;
  reference: string | null;
  lieu: string | null;
  vues: number;
  visiteurs: number;
  demandes: number;
}

export interface Totaux {
  /** Visiteurs distincts, jour par jour : une personne qui revient un autre jour compte à nouveau. */
  visites: number;
  pagesVues: number;
  /** Consultations de fiches de biens et de locations. */
  fichesVues: number;
  /** Demandes reçues par le formulaire du site. */
  demandes: number;
}

export interface ResumeVisites {
  jours: number;
  depuis: string;
  jusqua: string;
  totaux: Totaux;
  precedent: Totaux;
  serie: PointSerie[];
  sources: { source: SourceVisite; visites: number }[];
  terrains: LigneBien[];
  locations: LigneBien[];
  /** Fiches regardées qui n'ont donné lieu à aucune demande sur la période. */
  sansDemande: LigneBien[];
  vitrine: LigneBien[];
}

export interface DetailBien {
  type: TypeFiche;
  id: string;
  jours: number;
  totaux: { vues: number; visiteurs: number; demandes: number };
  septJours: { vues: number; visiteurs: number };
  serie: { jour: string; vues: number; visiteurs: number }[];
  sources: { source: SourceVisite; visiteurs: number }[];
}
