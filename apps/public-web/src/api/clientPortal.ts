import { apiClient } from './client';
import type { ClientDemandes, ClientDossier } from '../types/clientPortal';
import type { ClientMission } from '../types/mission';

export function fetchClientPortal(token: string): Promise<ClientDossier[]> {
  return apiClient.get<ClientDossier[]>('/ventes/client/portal', undefined, { token });
}

export function fetchClientDemandes(token: string): Promise<ClientDemandes> {
  return apiClient.get<ClientDemandes>('/ventes/client/portal/demandes', undefined, { token });
}

export type ClientDemandeType = 'information' | 'visite' | 'reservation';

export interface ClientDemandePayload {
  type: ClientDemandeType;
  message: string;
  terrainId?: string;
  sujet?: string;
}

/**
 * Demande déposée par un client connecté : l'API prend son identité dans son
 * compte, la demande est donc toujours rattachée à son espace.
 */
export function createClientDemande(
  token: string,
  payload: ClientDemandePayload,
): Promise<{ kind: 'message' | 'reservation'; id: string }> {
  return apiClient.post('/ventes/client/portal/demandes', payload, { token });
}

/**
 * Missions de vérification foncière du client connecté (J2.2). L'API filtre
 * sur son compte : il ne voit que les siennes, et seulement les pièces que
 * MTM a publiées.
 */
export function fetchClientMissions(token: string): Promise<ClientMission[]> {
  return apiClient.get<ClientMission[]>('/demarches/missions/client/missions', undefined, {
    token,
  });
}
