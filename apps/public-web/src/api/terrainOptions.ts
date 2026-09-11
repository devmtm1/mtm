import { apiClient } from './client';

/**
 * Options de filtres du catalogue public : statuts juridiques issus du
 * paramétrage administrable, zones et vocations dérivées des terrains
 * réellement publiés.
 */
export interface PublicTerrainFilterOptions {
  statutJuridique: string[];
  region: string[];
  commune: string[];
  vocation: string[];
}

export function fetchTerrainFilterOptions(): Promise<PublicTerrainFilterOptions> {
  return apiClient.get<PublicTerrainFilterOptions>('/terrains/public/options');
}
