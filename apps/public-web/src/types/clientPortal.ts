export interface ClientDossierTerrain {
  referenceInterne: string;
  nom: string;
  region: string | null;
  commune: string | null;
}

export interface ClientDossierReservation {
  reference: string | null;
  montantAcompte: number;
  dateExpiration: string;
  statut: string;
}

export interface ClientDossierPaiement {
  montant: number;
  datePaiement: string;
  mode: string;
  reference: string | null;
}

export interface ClientDossierDocument {
  id: string;
  type: string;
  title: string | null;
  version: number;
  createdAt: string;
  secureUrl: string;
}

export interface ClientDemandeTerrain {
  referenceInterne: string;
  nom: string;
}

export interface ClientMessage {
  id: string;
  sujet: string | null;
  message: string;
  createdAt: string;
  /** Le message a été pris en charge par l'équipe MTM. */
  traite: boolean;
  terrain: ClientDemandeTerrain | null;
}

export interface ClientReservationRequest {
  id: string;
  statut: string;
  message: string | null;
  createdAt: string;
  terrain: ClientDemandeTerrain | null;
}

export interface ClientDemandes {
  messages: ClientMessage[];
  reservations: ClientReservationRequest[];
}

export interface ClientDossier {
  id: string;
  referenceInterne: string | null;
  statut: string;
  prixVente: number | null;
  createdAt: string;
  terrain: ClientDossierTerrain | null;
  reservations: ClientDossierReservation[];
  paiements: ClientDossierPaiement[];
  documents: ClientDossierDocument[];
  montantPaye: number;
}
