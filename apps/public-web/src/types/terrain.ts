export interface PointInteret {
  nom: string;
  type?: string;
  distanceKm?: number;
  latitude?: number;
  longitude?: number;
}

export interface TerrainMedia {
  id: string;
  type: string;
  title: string | null;
  isPublic: boolean;
  sortOrder: number;
  secureUrl: string;
  capturedAt: string | null;
  createdAt: string;
}

export interface TerrainDocument {
  id: string;
  type: string;
  title: string | null;
  isPublic: boolean;
  version: number;
  secureUrl: string;
  createdAt: string;
}

/**
 * Reflet strict de PublicTerrainResponse (apps/api/src/modules/terrains/dto/public-terrain.dto.ts).
 * Ne jamais y ajouter un champ interne (prix d'acquisition, marge, commission, notes) :
 * l'API ne les expose de toute façon jamais sur ces routes publiques.
 */
export interface Terrain {
  id: string;
  /** « Disponible », ou « Vendu » pour une référence vendue (fiche réduite, sans prix). */
  statutCommercial: string;
  /** Date de la vente d'une référence vendue, quand elle est connue. */
  venduLe: string | null;
  referenceInterne: string;
  nom: string;
  statutJuridique: string;
  niveauVerification: string;
  region: string | null;
  commune: string | null;
  localisationDetail: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Nature du bien : terrain nu, villa, appartement… */
  typeBien: string;
  /** Surface de la parcelle, pour un terrain comme pour un bien bâti. */
  superficie: number | null;
  uniteSuperficie: string | null;
  dimensions: Record<string, unknown> | null;
  // --- Caractéristiques du bâti, nulles sur une parcelle nue ---
  /** Surface habitable, distincte de la parcelle. */
  surfaceHabitable: number | null;
  /** Typologie commerciale : F1 à F6. */
  nombrePieces: string | null;
  nombreChambres: number | null;
  nombreSallesEau: number | null;
  niveaux: number | null;
  anneeConstruction: number | null;
  etatBien: string | null;
  prixPublic: number | null;
  misEnAvant: boolean;
  description: string | null;
  accesRoutier: string | null;
  eauDisponible: boolean | null;
  electriciteDisponible: boolean | null;
  voisinage: string | null;
  vocation: string | null;
  proximiteAxes: string | null;
  pointsInteret: PointInteret[] | null;
  medias: TerrainMedia[];
  documents: TerrainDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface TerrainPage {
  items: Terrain[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TerrainFilters {
  search?: string;
  region?: string;
  commune?: string;
  vocation?: string;
  /**
   * Nature du bien recherché. À ne pas confondre avec `vocation`, qui dit
   * l'usage du sol et non ce qui est vendu.
   */
  typeBien?: string;
  /** Typologie d'un bien bâti : F3, F4… */
  nombrePieces?: string;
  statutJuridique?: string;
  niveauVerification?: string;
  /**
   * `disponible` : les biens à vendre (par défaut pour l'API) ; `vendu` : les
   * références vendues que MTM affiche ; `tous` : les deux, les biens à vendre d'abord.
   */
  statut?: 'disponible' | 'vendu' | 'tous';
  misEnAvant?: boolean;
  superficieMin?: number;
  superficieMax?: number;
  prixPublicMin?: number;
  prixPublicMax?: number;
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'referenceInterne' | 'nom' | 'superficie' | 'prixPublic';
  sortOrder?: 'asc' | 'desc';
}
