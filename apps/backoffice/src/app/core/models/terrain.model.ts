export type NumericOrString = number | string | null;

export interface ProprietaireSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  notes?: string | null;
  /** Renvoyé par la liste et la fiche : terrains et mandats rattachés. */
  _count?: { terrains: number; mandats: number };
}

export interface TerrainListItem {
  id: string;
  referenceInterne: string;
  nom: string;
  parcelleMatricule: string | null;
  statutJuridique: string;
  typeDocumentFoncier: string | null;
  niveauVerification: string;
  region: string | null;
  commune: string | null;
  superficie: NumericOrString;
  prixPublic: NumericOrString;
  statutCommercial: string;
  misEnAvant: boolean;
  medias?: TerrainMedia[];
  /** Renvoyé par la liste (sélection réduite) ; complet dans TerrainDetail. */
  proprietaire?: { id: string; firstName: string; lastName: string } | null;
}

export interface TerrainDetail extends TerrainListItem {
  localisationDetail: string | null;
  latitude: NumericOrString;
  longitude: NumericOrString;
  dimensions: unknown;
  prixAcquisition: NumericOrString;
  marge: NumericOrString;
  commission: NumericOrString;
  accesRoutier: string | null;
  eauDisponible: boolean | null;
  electriciteDisponible: boolean | null;
  voisinage: string | null;
  vocation: string | null;
  proximiteAxes: string | null;
  pointsInteret: TerrainPointInteret[] | null;
  description: string | null;
  notesInternes: string | null;
  proprietaire: ProprietaireSummary | null;
  commercialResponsable: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
  updatedAt: string;
  medias: TerrainMedia[];
  documents: TerrainDocument[];
}

export interface TerrainMedia {
  id: string;
  type: string;
  title: string | null;
  isPublic: boolean;
  storageKey: string;
  resourceType: string;
  secureUrl: string;
}

export interface TerrainDocument {
  id: string;
  type: string;
  title: string | null;
  isPublic: boolean;
  storageKey: string;
  resourceType: string;
  secureUrl: string;
  version: number;
}

export interface TerrainPage {
  items: TerrainListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TerrainQuery {
  search?: string;
  statutJuridique?: string;
  niveauVerification?: string;
  statutCommercial?: string;
  vocation?: string;
  proprietaireId?: string;
  page?: number;
  pageSize?: number;
}

export interface TerrainPointInteret {
  nom: string;
  type?: string;
  distanceKm?: number;
  latitude?: number;
  longitude?: number;
}

/** Synthèse du portefeuille (GET /terrains/stats). */
export interface TerrainStats {
  total: number;
  parStatut: Partial<Record<string, number>>;
  misEnAvant: number;
  sansGps: number;
  nonVerifies: number;
  sansPhotoPublique: number;
}

export interface TerrainOptions {
  statutJuridique: string[];
  niveauVerification: string[];
  statutCommercial: string[];
}

export interface CreateTerrainPayload {
  referenceInterne: string;
  nom: string;
  parcelleMatricule?: string;
  proprietaireId?: string;
  statutJuridique: string;
  typeDocumentFoncier?: string;
  niveauVerification: string;
  region?: string;
  commune?: string;
  localisationDetail?: string;
  latitude?: number;
  longitude?: number;
  superficie?: number;
  uniteSuperficie?: string;
  dimensions?: Record<string, unknown>;
  prixAcquisition?: number;
  prixPublic?: number;
  marge?: number;
  commission?: number;
  statutCommercial: string;
   accesRoutier?: string;
  misEnAvant?: boolean;
  eauDisponible?: boolean;
  electriciteDisponible?: boolean;
  voisinage?: string;
  vocation?: string;
  proximiteAxes?: string;
  pointsInteret?: TerrainPointInteret[];
  description?: string;
  notesInternes?: string;
  commercialResponsableId?: string;
  /** Obligatoire côté API si un champ sensible (prix, marge, commission, propriétaire) est modifié. */
  justification?: string;
}
