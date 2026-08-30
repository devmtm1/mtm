export type TerrainMedia = {
  secureUrl?: string;
  type?: string;
};

export type TerrainDocument = {
  secureUrl: string;
  type: string;
  title: string | null;
};

export type Terrain = {
  id: string;
  name: string;
  location: string;
  region: string;
  size: string;
  price: string;
  status: string;
  legalStatus: string;
  tag: string;
  image: string;
  detail?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  access?: string | null;
  waterAvailable?: boolean | null;
  electricityAvailable?: boolean | null;
  vocation?: string | null;
  media?: TerrainMedia[];
  documents?: TerrainDocument[];
  pointsInteret?: Array<Record<string, unknown>> | null;
  dimensions?: Record<string, unknown> | null;
  superficieRaw?: number | null;
  prixPublicRaw?: number | null;
  misEnAvant?: boolean;
};

export type PublicTerrainResponse = {
  id: string;
  referenceInterne: string;
  nom: string;
  statutJuridique: string;
  niveauVerification: string;
  region?: string | null;
  commune?: string | null;
  superficie?: number | string | null;
  uniteSuperficie?: string | null;
  prixPublic?: number | string | null;
  misEnAvant?: boolean;
  medias?: TerrainMedia[];
  documents?: TerrainDocument[];
  localisationDetail?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  accesRoutier?: string | null;
  eauDisponible?: boolean | null;
  electriciteDisponible?: boolean | null;
  voisinage?: string | null;
  vocation?: string | null;
  proximiteAxes?: string | null;
  pointsInteret?: Array<Record<string, unknown>> | null;
  dimensions?: Record<string, unknown> | null;
};
