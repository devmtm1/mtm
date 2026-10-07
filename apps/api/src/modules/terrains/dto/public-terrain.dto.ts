export interface PublicTerrainMedia {
  id: string;
  type: string;
  title: string | null;
  isPublic: boolean;
  sortOrder: number;
  secureUrl: string;
  capturedAt: string | null;
  createdAt: string;
}

export interface PublicPointInteret {
  nom: string;
  type?: string;
  distanceKm?: number;
  latitude?: number;
  longitude?: number;
}

export interface PublicTerrainDocument {
  id: string;
  type: string;
  title: string | null;
  isPublic: boolean;
  version: number;
  secureUrl: string;
  createdAt: string;
}

export interface PublicTerrainResponse {
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
  typeBien: string;
  /** Surface de la parcelle. */
  superficie: number | null;
  uniteSuperficie: string | null;
  dimensions: Record<string, unknown> | null;
  /** Surface habitable, nulle sur un terrain nu. */
  surfaceHabitable: number | null;
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
  pointsInteret: PublicPointInteret[] | null;
  medias: PublicTerrainMedia[];
  documents: PublicTerrainDocument[];
  createdAt: string;
  updatedAt: string;
}
