import { apiClient } from './client';
import type { Terrain, TerrainFilters, TerrainPage } from '../types/terrain';

export function fetchTerrains(filters: TerrainFilters = {}): Promise<TerrainPage> {
  return apiClient.get<TerrainPage>('/terrains/public', { ...filters });
}

export function fetchTerrain(id: string): Promise<Terrain> {
  return apiClient.get<Terrain>(`/terrains/public/${id}`);
}
