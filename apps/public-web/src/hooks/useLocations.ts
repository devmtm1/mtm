import { useMemo } from 'react';
import { fetchLocation, fetchLocationFilterOptions, fetchLocations } from '../api/locations';
import type { LocationFilters } from '../types/location';
import { useAsyncData } from './useAsyncData';

export function useLocationsCatalog(filters: LocationFilters) {
  const filtersKey = JSON.stringify(filters);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableFilters = useMemo(() => filters, [filtersKey]);

  return useAsyncData(() => fetchLocations(stableFilters), [stableFilters]);
}

export function useLocation(id: string | undefined) {
  return useAsyncData(() => {
    if (!id) return Promise.reject(new Error('Annonce introuvable'));
    return fetchLocation(id);
  }, [id]);
}

export function useLocationFilterOptions() {
  return useAsyncData(() => fetchLocationFilterOptions(), []);
}
