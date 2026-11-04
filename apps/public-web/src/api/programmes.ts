import { apiClient } from './client';

/** Reflet de ProgrammesPublicService (apps/api) : rien d'interne, ni propriétaire, ni commission, ni prix d'acquisition. */
export type StatutLotPublic = 'Disponible' | 'Réservé' | 'Vendu';

/** Un visuel du programme : une photo ou le plan de masse. */
export interface MediaProgramme {
  id: string;
  type: 'photo' | 'plan' | string;
  title: string | null;
  secureUrl: string;
}

/** Ce que montre la carte d'un programme dans le catalogue, sur l'accueil et dans « Autres lotissements ». */
export interface ProgrammePublic {
  id: string;
  reference: string;
  nom: string;
  region: string | null;
  commune: string | null;
  localisationDetail: string | null;
  description: string | null;
  statutJuridique: string;
  niveauVerification: string;
  /** Photo du programme, à défaut celle d'un de ses lots à vendre. */
  couverture: string | null;
  lotsTotal: number;
  lotsDisponibles: number;
  lotsReserves: number;
  lotsVendus: number;
  prixMin: number | null;
  prixMax: number | null;
  superficieMin: number | null;
  superficieMax: number | null;
  uniteSuperficie: string | null;
}

export interface LotPublic {
  id: string;
  numeroLot: string | null;
  statut: StatutLotPublic;
  superficie: number | null;
  uniteSuperficie: string | null;
  categorieLot: { nom: string } | null;
  /** Vides pour un lot réservé ou vendu : il reste visible, grisé, sans prix. */
  prixPublic: number | null;
  modalitePaiement: string | null;
  dureeMoratoireMois: number | null;
  acompteMontant: number | null;
  photo: string | null;
}

export interface CategoriePublique {
  nom: string;
  lotsDisponibles: number;
  prixMin: number | null;
  prixMax: number | null;
}

export interface ConditionsPubliques {
  modalites: string[];
  acompteMin: number | null;
  moratoireMax: number | null;
}

export interface ProgrammePublicDetail extends ProgrammePublic {
  medias: MediaProgramme[];
  categories: CategoriePublique[];
  conditions: ConditionsPubliques;
  lots: LotPublic[];
}

/** Les critères du catalogue qui valent aussi pour les programmes : mêmes noms que pour les biens. */
export interface ProgrammeFilters {
  search?: string;
  region?: string;
  commune?: string;
  statutJuridique?: string;
  prixPublicMin?: number;
  prixPublicMax?: number;
  superficieMin?: number;
  superficieMax?: number;
}

export function fetchProgrammes(filters: ProgrammeFilters = {}): Promise<ProgrammePublic[]> {
  return apiClient.get<ProgrammePublic[]>('/programmes/public', { ...filters });
}

export function fetchProgramme(id: string): Promise<ProgrammePublicDetail> {
  return apiClient.get<ProgrammePublicDetail>(`/programmes/public/${id}`);
}
