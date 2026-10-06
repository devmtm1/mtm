/** Photo ou vidéo d'une annonce de location. */
export interface LocationMedia {
  id: string;
  type: 'photo' | 'video';
  title: string | null;
  secureUrl: string;
}

/**
 * Annonce de location telle que le site public la reçoit. L'API ne renvoie
 * ni l'adresse exacte, ni le propriétaire, ni les notes internes : la
 * position, elle, est arrondie au quartier.
 */
export interface Location {
  id: string;
  referenceInterne: string;
  type: string;
  titre: string | null;
  description: string | null;
  commune: string | null;
  region: string | null;
  superficie: number | null;
  loyerMensuel: number | null;
  charges: number | null;
  moisCaution: number | null;
  montantCaution: number | null;
  nombrePieces: number | null;
  nombreChambres: number | null;
  nombreSallesEau: number | null;
  meuble: boolean;
  equipements: string[];
  latitude: number | null;
  longitude: number | null;
  disponibleLe: string | null;
  misEnAvant: boolean;
  publieLe: string | null;
  medias: LocationMedia[];
}

export type LocationSortKey = 'recent' | 'loyer_asc' | 'loyer_desc' | 'superficie_desc';

export interface LocationFilters {
  search?: string;
  type?: string;
  region?: string;
  commune?: string;
  loyerMin?: number;
  loyerMax?: number;
  chambresMin?: number;
  superficieMin?: number;
  meuble?: boolean;
  misEnAvant?: boolean;
  sortBy?: 'createdAt' | 'loyerMensuel' | 'superficie';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface LocationPage {
  items: Location[];
  total: number;
  page: number;
  pageSize: number;
}

/** Valeurs proposées par les filtres, dérivées des annonces visibles. */
export interface LocationFilterOptions {
  type: string[];
  region: string[];
  commune: string[];
  chambres: number[];
  loyerMin: number | null;
  loyerMax: number | null;
  total: number;
}
