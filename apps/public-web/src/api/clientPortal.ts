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

export interface ClientMissionPayload {
  typeVerification: string;
  objectif: string;
  terrainId?: string;
  localisation?: string;
  commune?: string;
  region?: string;
  piecesFournies?: string;
  urgence?: string;
}

/**
 * Demande de vérification déposée par un client connecté : elle arrive chez
 * MTM comme une mission à l'étape « demande », sans prix ni délai — c'est
 * l'équipe qui les fixe après étude.
 */
export function createClientMission(
  token: string,
  payload: ClientMissionPayload,
): Promise<{ id: string; referenceInterne: string | null; statut: string }> {
  return apiClient.post('/demarches/missions/client/missions', payload, { token });
}
