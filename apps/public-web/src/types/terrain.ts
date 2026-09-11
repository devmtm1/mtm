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
  referenceInterne: string;
  nom: string;
  statutJuridique: string;
  niveauVerification: string;
  region: string | null;
  commune: string | null;
  localisationDetail: string | null;
  latitude: number | null;
  longitude: number | null;
  superficie: number | null;
  uniteSuperficie: string | null;
  dimensions: Record<string, unknown> | null;
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
  statutJuridique?: string;
  niveauVerification?: string;
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
