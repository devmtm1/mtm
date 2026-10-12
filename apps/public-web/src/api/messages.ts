import { apiClient } from './client';

/** Dossiers dont le client lit et écrit le fil depuis son espace. */
export type TypeDossierClient = 'vente' | 'mission' | 'chantier' | 'bail';

export interface MessageClient {
  id: string;
  corps: string;
  createdAt: string;
  /** Vrai pour un message écrit par le client lui-même. */
  deClient: boolean;
  /** « Vous » ou le prénom du collaborateur MTM. */
  auteur: string;
}

export function fetchEchanges(
  token: string,
  type: TypeDossierClient,
  id: string,
): Promise<{ items: MessageClient[] }> {
  return apiClient.get(`/messages/client/${type}/${id}`, undefined, { token });
}

export function sendEchange(
  token: string,
  type: TypeDossierClient,
  id: string,
  corps: string,
): Promise<MessageClient> {
  return apiClient.post(`/messages/client/${type}/${id}`, { corps }, { token });
}
