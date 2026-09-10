import { apiClient } from './client';
import type { ClientDossier } from '../types/clientPortal';

export function fetchClientPortal(token: string): Promise<ClientDossier[]> {
  return apiClient.get<ClientDossier[]>('/ventes/client/portal', undefined, { token });
}

export function fetchClientDocument(
  token: string,
  documentId: string,
): Promise<{ id: string; title: string | null; type: string; secureUrl: string }> {
  return apiClient.get(`/ventes/client/portal/documents/${documentId}`, undefined, { token });
}
