import { apiClient } from './client';

/**
 * Options de filtres du catalogue public : statuts juridiques issus du
 * paramétrage administrable, zones, vocations et natures de bien dérivées
 * des biens réellement publiés.
 */
export interface PublicTerrainFilterOptions {
  statutJuridique: string[];
  region: string[];
  commune: string[];
  vocation: string[];
  /** Natures de bien effectivement en vente : terrain, villa… */
  typeBien: string[];
  /** Typologies disponibles parmi les biens bâtis publiés. */
  nombrePieces: string[];
}

export function fetchTerrainFilterOptions(): Promise<PublicTerrainFilterOptions> {
  return apiClient.get<PublicTerrainFilterOptions>('/terrains/public/options');
}
