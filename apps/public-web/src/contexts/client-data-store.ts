import { createContext, useContext } from 'react';
import type { ClientDemandes, ClientDossier } from '../types/clientPortal';
import type { ClientMission } from '../types/mission';

export interface ClientDataValue {
  dossiers: ClientDossier[] | null;
  dossiersLoading: boolean;
  dossiersError: string | null;
  demandes: ClientDemandes | null;
  demandesLoading: boolean;
  demandesError: string | null;
  missions: ClientMission[] | null;
  missionsLoading: boolean;
  missionsError: string | null;
  /** À appeler après l'envoi d'une demande depuis l'espace client. */
  refetchDemandes: () => void;
  /** À appeler après avoir demandé une nouvelle vérification. */
  refetchMissions: () => void;
}

/**
 * Données de l'espace client, chargées une fois par la coquille de
 * l'application et partagées entre ses écrans (accueil, dossiers, demandes) :
 * passer d'un onglet à l'autre ne relance pas d'appel réseau.
 */
export const ClientDataContext = createContext<ClientDataValue | null>(null);

export function useClientData(): ClientDataValue {
  const context = useContext(ClientDataContext);
  if (!context) throw new Error('useClientData doit être utilisé dans <ClientLayout>');
  return context;
}
