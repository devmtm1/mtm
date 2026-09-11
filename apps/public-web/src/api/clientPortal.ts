import { apiClient } from './client';
import type { ClientDemandes, ClientDossier } from '../types/clientPortal';

export function fetchClientPortal(token: string): Promise<ClientDossier[]> {
  return apiClient.get<ClientDossier[]>('/ventes/client/portal', undefined, { token });
}

export function fetchClientDemandes(token: string): Promise<ClientDemandes> {
  return apiClient.get<ClientDemandes>('/ventes/client/portal/demandes', undefined, { token });
}
