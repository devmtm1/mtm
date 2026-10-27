export interface ContactPayload {
  nom: string;
  email: string;
  telephone?: string;
  sujet?: string;
  message: string;
  terrainId?: string;
  /** Annonce de location d'où part la demande. */
  bienLocatifId?: string;
}

export interface ContactResult {
  success: true;
}

/** Natures de biens proposables à la gestion. */
export const TYPES_BIEN_CONFIE = [
  { value: 'appartement', label: 'Appartement' },
  { value: 'villa', label: 'Villa' },
  { value: 'immeuble', label: 'Immeuble ou villa divisée en plusieurs logements' },
  { value: 'bureau', label: 'Bureau' },
  { value: 'commerce', label: 'Local commercial' },
  { value: 'courte_duree', label: 'Bien meublé en courte durée' },
  { value: 'autre', label: 'Autre' },
] as const;

export const SITUATIONS_BIEN_CONFIE = [
  { value: 'libre', label: 'Libre' },
  { value: 'loue', label: 'Déjà loué' },
  { value: 'en_travaux', label: 'En travaux' },
] as const;

/** Un propriétaire propose un bien à la gestion (page « Gestion locative »). */
export interface ConfierBienPayload {
  nom: string;
  email: string;
  telephone: string;
  pays?: string;
  typeBien: string;
  commune: string;
  region?: string;
  nombreLogements?: number;
  situation: string;
  loyerSouhaite?: number;
  precisions?: string;
  consentement: boolean;
  /** Piège à robots : toujours vide pour un visiteur. */
  siteWeb?: string;
}

export const TYPES_PROJET_CONSTRUCTION = [
  { value: 'villa', label: 'Construction d’une villa ou d’une maison' },
  { value: 'immeuble', label: 'Construction d’un immeuble' },
  { value: 'renovation', label: 'Rénovation ou extension' },
  { value: 'amenagement', label: 'Aménagement ou finitions' },
  { value: 'autre', label: 'Autre projet' },
] as const;

export const SITUATIONS_TERRAIN = [
  { value: 'possede', label: 'J’ai déjà un terrain' },
  { value: 'a_trouver', label: 'Je cherche un terrain' },
] as const;

/** Demande de devis pour un projet de construction (page « Construction »). */
export interface DevisConstructionPayload {
  nom: string;
  email: string;
  telephone: string;
  pays?: string;
  typeProjet: string;
  terrain: string;
  commune: string;
  budget?: number;
  precisions?: string;
  consentement: boolean;
  /** Piège à robots : toujours vide pour un visiteur. */
  siteWeb?: string;
}
