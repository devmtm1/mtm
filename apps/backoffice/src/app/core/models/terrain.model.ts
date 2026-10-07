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
  /** Nature du bien : terrain nu, villa, appartement… */
  typeBien: string;
  /** Surface de la parcelle. */
  superficie: NumericOrString;
  /** Surface habitable, nulle sur un terrain nu. */
  surfaceHabitable: NumericOrString;
  /** Typologie commerciale d'un bien bâti : F1 à F6. */
  nombrePieces: string | null;
  prixPublic: NumericOrString;
  statutCommercial: string;
  misEnAvant: boolean;
  /** Bien vendu affiché sur le site public comme référence (badge « Vendu », sans prix). */
  referenceVendue?: boolean;
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
  // --- Caractéristiques du bâti, nulles sur un terrain nu ---
  nombreChambres: number | null;
  nombreSallesEau: number | null;
  niveaux: number | null;
  anneeConstruction: number | null;
  etatBien: string | null;
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
  /** Nature du bien — à ne pas confondre avec `vocation`, l'usage du sol. */
  typeBien?: string;
  nombrePieces?: string;
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
  typeBien: string[];
  nombrePieces: string[];
  etatBien: string[];
  /** Usage prévu du sol, désormais contrôlé et non plus saisi librement. */
  vocation: string[];
  /**
   * Types qui ouvrent la section « bâti » du formulaire. L'API en est la
   * source : les écrans n'ont pas à deviner qu'un studio est bâti et un
   * terrain non.
   */
  typesBati: string[];
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
  typeBien?: string;
  superficie?: number;
  uniteSuperficie?: string;
  dimensions?: Record<string, unknown>;
  // --- Caractéristiques du bâti : refusées par l'API sur un terrain nu ---
  surfaceHabitable?: number;
  nombrePieces?: string;
  nombreChambres?: number;
  nombreSallesEau?: number;
  niveaux?: number;
  anneeConstruction?: number;
  etatBien?: string;
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

/**
 * Terrain tel qu'on le propose à un prospect : seulement ce qu'on dit au
 * client. Le catalogue ignore le responsable du terrain, car proposer un
 * terrain n'est pas le gérer.
 */
export interface TerrainCatalogueItem {
  id: string;
  referenceInterne: string;
  nom: string;
  commune: string | null;
  region: string | null;
  superficie: number | null;
  prixPublic: number | null;
  statutCommercial: string;
}
