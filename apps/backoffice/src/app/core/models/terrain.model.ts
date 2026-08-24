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
  superficie: number | string | null;
  prixPublic: number | string | null;
  statutCommercial: string;
}

export interface TerrainDetail extends TerrainListItem {
  localisationDetail: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  dimensions: unknown;
  prixAcquisition: number | string | null;
  marge: number | string | null;
  commission: number | string | null;
  accesRoutier: string | null;
  eauDisponible: boolean | null;
  electriciteDisponible: boolean | null;
  voisinage: string | null;
  vocation: string | null;
  proximiteAxes: string | null;
  notesInternes: string | null;
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
}

export interface TerrainDocument {
  id: string;
  type: string;
  title: string | null;
  isPublic: boolean;
  storageKey: string;
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
  page?: number;
  pageSize?: number;
}

export interface CreateTerrainPayload {
  referenceInterne: string;
  nom: string;
  parcelleMatricule?: string;
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
  prixAcquisition?: number;
  prixPublic?: number;
  marge?: number;
  commission?: number;
  statutCommercial: string;
  accesRoutier?: string;
  eauDisponible?: boolean;
  electriciteDisponible?: boolean;
  voisinage?: string;
  vocation?: string;
  proximiteAxes?: string;
  notesInternes?: string;
  commercialResponsableId?: string;
}