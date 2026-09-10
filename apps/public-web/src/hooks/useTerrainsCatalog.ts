import { useMemo } from 'react';
import { fetchTerrains } from '../api/terrains';
import type { TerrainFilters } from '../types/terrain';
import { useAsyncData } from './useAsyncData';

export function useTerrainsCatalog(filters: TerrainFilters) {
  const filtersKey = JSON.stringify(filters);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableFilters = useMemo(() => filters, [filtersKey]);

  return useAsyncData(() => fetchTerrains(stableFilters), [stableFilters]);
}
