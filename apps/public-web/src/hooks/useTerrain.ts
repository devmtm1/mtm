import { fetchTerrain } from '../api/terrains';
import { useAsyncData } from './useAsyncData';

export function useTerrain(id: string | undefined) {
  return useAsyncData(() => {
    if (!id) return Promise.reject(new Error('Identifiant de terrain manquant'));
    return fetchTerrain(id);
  }, [id]);
}
