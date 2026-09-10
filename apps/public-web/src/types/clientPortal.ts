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
