import { apiClient, ApiError } from './client';
import type { ClientDemandes, ClientDossier } from '../types/clientPortal';
import type { ClientMission } from '../types/mission';
import type {
  ClientBailLocataire,
  ClientBienLocatif,
  ClientDocumentLocatif,
  ClientIncidentLocatif,
  ClientPaiementLoyer,
  ClientSyntheseProprietaire,
} from '../types/locatif';
import type {
  ClientChantier,
  ClientChantierDetail,
} from '../types/chantier';

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
  budgetAnnonce?: number;
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

/**
 * Un compte non rattaché à un propriétaire ou un locataire (la grande
 * majorité des clients, simples acheteurs) reçoit un 403 sur ces routes :
 * ce n'est pas une erreur à afficher, juste « cet espace ne concerne pas ce
 * compte ». On le transforme en `null` pour que l'onglet reste masqué sans
 * bandeau d'erreur.
 */
async function ouNonApplicable<T>(promesse: Promise<T>): Promise<T | null> {
  try {
    return await promesse;
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) return null;
    throw error;
  }
}

/** Espace propriétaire (J2.1, section 15) : biens confiés et loyers encaissés. */
export function fetchProprietaireBiens(token: string): Promise<ClientBienLocatif[] | null> {
  return ouNonApplicable(
    apiClient.get<ClientBienLocatif[]>('/locatif/proprietaire/biens', undefined, { token }),
  );
}

/** Loyers appelés, encaissés et solde du portefeuille (section 15). */
export function fetchProprietaireSynthese(
  token: string,
): Promise<ClientSyntheseProprietaire | null> {
  return ouNonApplicable(
    apiClient.get<ClientSyntheseProprietaire>('/locatif/proprietaire/synthese', undefined, {
      token,
    }),
  );
}

export function fetchProprietaireDocuments(
  token: string,
): Promise<ClientDocumentLocatif[] | null> {
  return ouNonApplicable(
    apiClient.get<ClientDocumentLocatif[]>('/locatif/proprietaire/documents', undefined, {
      token,
    }),
  );
}

/** Espace locataire (J2.1, section 15) : bail, quittances, paiements, incidents. */
export function fetchLocataireBaux(token: string): Promise<ClientBailLocataire[] | null> {
  return ouNonApplicable(
    apiClient.get<ClientBailLocataire[]>('/locatif/locataire/baux', undefined, { token }),
  );
}

export function fetchLocatairePaiements(token: string): Promise<ClientPaiementLoyer[] | null> {
  return ouNonApplicable(
    apiClient.get<ClientPaiementLoyer[]>('/locatif/locataire/paiements', undefined, { token }),
  );
}

export function fetchLocataireIncidents(token: string): Promise<ClientIncidentLocatif[] | null> {
  return ouNonApplicable(
    apiClient.get<ClientIncidentLocatif[]>('/locatif/locataire/incidents', undefined, { token }),
  );
}

export interface ClientIncidentPayload {
  /** incident | demande (sections 4 et 15). */
  nature?: string;
  type: string;
  description: string;
}

export function createLocataireIncident(
  token: string,
  bailId: string,
  payload: ClientIncidentPayload,
): Promise<{ id: string }> {
  return apiClient.post(`/locatif/locataire/baux/${bailId}/incidents`, payload, { token });
}

/**
 * Chantiers du client (J2.3, section 16 : « espace client permettant de
 * consulter l'avancement et les rapports autorisés »).
 *
 * Comme pour la gestion locative, un compte sans chantier rattaché reçoit
 * `null` plutôt qu'une erreur : l'onglet reste masqué.
 */
export function fetchClientChantiers(token: string): Promise<ClientChantier[] | null> {
  return ouNonApplicable(
    apiClient.get<ClientChantier[]>('/construction/chantiers/client/chantiers', undefined, {
      token,
    }),
  );
}

export function fetchClientChantier(
  token: string,
  id: string,
): Promise<ClientChantierDetail> {
  return apiClient.get<ClientChantierDetail>(
    `/construction/chantiers/client/chantiers/${id}`,
    undefined,
    { token },
  );
}
