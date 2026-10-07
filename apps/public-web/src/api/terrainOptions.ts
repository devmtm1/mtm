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
  /** Typologies proposées à la recherche : F1 à F6, liste fermée. */
  nombrePieces: string[];
  /** Références vendues que MTM affiche : l'onglet « Vendus » n'existe que s'il y en a. */
  vendus: number;
}

export function fetchTerrainFilterOptions(): Promise<PublicTerrainFilterOptions> {
  return apiClient.get<PublicTerrainFilterOptions>('/terrains/public/options');
}
