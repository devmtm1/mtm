import { apiClient } from './client';
import type {
  Location,
  LocationFilterOptions,
  LocationFilters,
  LocationPage,
  DemandeSejourPayload,
  DemandeSejourResultat,
  PeriodeIndisponible,
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

/** Nuits déjà prises d'un bien en courte durée. */
export function fetchDisponibilites(id: string): Promise<PeriodeIndisponible[]> {
  return apiClient.get<PeriodeIndisponible[]>(`/locatif/public/biens/${id}/disponibilites`);
}

/** Demande de séjour : MTM la confirme ensuite, rien n'est réservé ni payé à cet instant. */
export function postDemandeSejour(id: string, payload: DemandeSejourPayload): Promise<DemandeSejourResultat> {
  return apiClient.post<DemandeSejourResultat>(`/locatif/public/biens/${id}/sejours/demande`, payload);
}
