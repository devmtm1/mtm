import { createContext, useContext } from 'react';
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
  /**
   * Gestion locative (J2.1) : `null` tant que le chargement n'a pas confirmé
   * que ce compte est bien rattaché à un propriétaire ou un locataire — les
   * onglets correspondants restent masqués jusque-là, pour ne pas encombrer
   * l'espace des simples acheteurs.
   */
  proprietaireBiens: ClientBienLocatif[] | null;
  proprietaireSynthese: ClientSyntheseProprietaire | null;
  proprietaireDocuments: ClientDocumentLocatif[] | null;
  proprietaireLoading: boolean;
  locataireBaux: ClientBailLocataire[] | null;
  locatairePaiements: ClientPaiementLoyer[] | null;
  locataireIncidents: ClientIncidentLocatif[] | null;
  locataireLoading: boolean;
  /** À appeler après l'envoi d'une demande depuis l'espace client. */
  refetchDemandes: () => void;
  /** À appeler après avoir demandé une nouvelle vérification. */
  refetchMissions: () => void;
  /** À appeler après le signalement d'un incident. */
  refetchLocataireIncidents: () => void;
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
