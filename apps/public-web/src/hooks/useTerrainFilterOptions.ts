import { fetchTerrainFilterOptions } from '../api/terrainOptions';
import { useAsyncData } from './useAsyncData';

export function useTerrainFilterOptions() {
  return useAsyncData(() => fetchTerrainFilterOptions(), []);
}
