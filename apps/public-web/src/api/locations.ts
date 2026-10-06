import { apiClient } from './client';
import type {
  Location,
  LocationFilterOptions,
  LocationFilters,
  LocationPage,
} from '../types/location';

export function fetchLocations(filters: LocationFilters = {}): Promise<LocationPage> {
  return apiClient.get<LocationPage>('/locatif/public/biens', { ...filters });
}

export function fetchLocation(id: string): Promise<Location> {
  return apiClient.get<Location>(`/locatif/public/biens/${id}`);
}

export function fetchLocationFilterOptions(): Promise<LocationFilterOptions> {
  return apiClient.get<LocationFilterOptions>('/locatif/public/biens/options');
}
