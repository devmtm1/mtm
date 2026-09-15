import { createContext, useContext } from 'react';
import type { ClientDemandes, ClientDossier } from '../types/clientPortal';

export interface ClientDataValue {
  dossiers: ClientDossier[] | null;
  dossiersLoading: boolean;
  dossiersError: string | null;
  demandes: ClientDemandes | null;
  demandesLoading: boolean;
  demandesError: string | null;
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
