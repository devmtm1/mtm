/**
 * Mission de vérification foncière vue par le client (section 14 du cahier
 * des charges) : l'avancement, la conclusion une fois rendue, et les seules
 * pièces que MTM a publiées.
 */
export interface ClientMissionDocument {
  id: string;
  type: string;
  title: string | null;
  createdAt: string;
  secureUrl: string;
}

export interface ClientMissionTerrain {
  id: string;
  nom: string;
  referenceInterne: string | null;
  commune: string | null;
  region: string | null;
}

export interface ClientMission {
  id: string;
  referenceInterne: string | null;
  typeVerification: string;
  objectif: string | null;
  localisation: string | null;
  commune: string | null;
  region: string | null;
  statut: string;
  urgence: string;
  dateDemande: string;
  dateEcheance: string | null;
  dateRapport: string | null;
  decision: string | null;
  conclusion: string | null;
  reserves: string | null;
  recommandation: string | null;
  montantDevis: number | null;
  montantPaye: number | null;
  terrain: ClientMissionTerrain | null;
  documents: ClientMissionDocument[];
}
