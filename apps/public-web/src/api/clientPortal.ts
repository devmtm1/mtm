import { apiClient, ApiError } from './client';
import type { ClientDemandes, ClientDossier } from '../types/clientPortal';
import type { ClientMission } from '../types/mission';
import type {
  ClientBailLocataire,
  ClientBienLocatif,
  ClientDocumentLocatif,
  ClientIncidentLocatif,
  ClientPaiementLoyer,
  ClientResiliation,
  ClientResiliationPayload,
  ClientResiliations,
  ClientSyntheseProprietaire,
  ClientAssurance,
} from '../types/locatif';
import type {
  ClientChantier,
  ClientChantierDetail,
} from '../types/chantier';

/**
 * Un compte propriétaire, locataire ou voyageur n'est pas un « client » au
 * sens des ventes : l'API répond 403 sur ces routes. Ce n'est pas une panne à
 * afficher en rouge, simplement « aucun dossier de vente ». On renvoie donc un
 * résultat vide, comme pour les autres espaces qui ne concernent pas le compte.
 */
async function videSiNonClient<T>(promesse: Promise<T>, vide: T): Promise<T> {
  try {
    return await promesse;
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) return vide;
    throw error;
  }
}

export function fetchClientPortal(token: string): Promise<ClientDossier[]> {
  return videSiNonClient(apiClient.get<ClientDossier[]>('/ventes/client/portal', undefined, { token }), []);
}

export function fetchClientDemandes(token: string): Promise<ClientDemandes> {
  return videSiNonClient(apiClient.get<ClientDemandes>('/ventes/client/portal/demandes', undefined, { token }), {
    messages: [],
    reservations: [],
  });
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
  return videSiNonClient(
    apiClient.get<ClientMission[]>('/demarches/missions/client/missions', undefined, {
      token,
    }),
    [],
  );
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

/** Demandes de résiliation du locataire et préavis qui s'applique. */
export function fetchLocataireResiliations(token: string): Promise<ClientResiliations | null> {
  return ouNonApplicable(
    apiClient.get<ClientResiliations>('/locatif/locataire/resiliations', undefined, { token }),
  );
}

export function createLocataireResiliation(
  token: string,
  bailId: string,
  payload: ClientResiliationPayload,
): Promise<ClientResiliation> {
  return apiClient.post(`/locatif/locataire/baux/${bailId}/resiliation`, payload, { token });
}

/** Le locataire retire sa demande tant que MTM ne l'a pas traitée. */
export function cancelLocataireResiliation(token: string, id: string): Promise<ClientResiliation> {
  return apiClient.delete(`/locatif/locataire/resiliations/${id}`, { token });
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

/**
 * Dépose l'attestation d'assurance habitation sur le bail en cours : le fichier et sa date de fin de validité. MTM la
 * contrôle ensuite ; l'état revient dans le bail du locataire.
 */
export function deposerAssurance(token: string, fichier: File, dateExpiration: string): Promise<ClientAssurance> {
  const corps = new FormData();
  corps.append('file', fichier);
  corps.append('dateExpiration', dateExpiration);
  return apiClient.postForm<ClientAssurance>('/locatif/locataire/assurance', corps, { token });
}
