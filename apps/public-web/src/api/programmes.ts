import { apiClient } from './client';

/** Reflet de ProgrammesService.findPublic (apps/api) : rien d'interne, ni propriétaire ni prix d'acquisition. */
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
  lotsDisponibles: number;
  prixMin: number | null;
  prixMax: number | null;
}

export interface LotPublic {
  id: string;
  numeroLot: string | null;
  superficie: number | null;
  uniteSuperficie: string | null;
  prixPublic: number | null;
  modalitePaiement: string | null;
  dureeMoratoireMois: number | null;
  acompteMontant: number | null;
  categorieLot: { nom: string } | null;
}

export interface ProgrammePublicDetail extends Omit<ProgrammePublic, 'lotsDisponibles' | 'prixMin' | 'prixMax'> {
  lots: LotPublic[];
}

export function fetchProgrammes(): Promise<ProgrammePublic[]> {
  return apiClient.get<ProgrammePublic[]>('/programmes/public');
}

export function fetchProgramme(id: string): Promise<ProgrammePublicDetail> {
  return apiClient.get<ProgrammePublicDetail>(`/programmes/public/${id}`);
}
