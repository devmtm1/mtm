export interface VenteProspect {
  id: string;
  nom: string;
  prenom: string | null;
  email: string | null;
}

export interface VenteTerrain {
  id: string;
  referenceInterne: string;
  nom: string;
  statutCommercial: string;
}

export interface VentePaiement {
  id: string;
  montant: number | string;
  datePaiement: string;
  mode: string;
  statut: string;
  reference: string | null;
}

export interface VenteReservation {
  id: string;
  montantAcompte: number | string;
  dureeBlocageJours: number;
  dateExpiration: string;
  statut: string;
  reference: string | null;
}

export interface DossierVenteListItem {
  id: string;
  referenceInterne: string | null;
  statut: string;
  prixVente: number | string | null;
  montantPaye: number;
  soldeRestant: number | null;
  createdAt: string;
  prospect: VenteProspect;
  terrain: VenteTerrain | null;
  reservations: VenteReservation[];
  paiements?: VentePaiement[];
  _count: { documents: number; commissions: number };
}

export interface ReservationRequestItem {
  id: string;
  nom: string;
  email: string;
  telephone: string | null;
  message: string | null;
  statut: string;
  createdAt: string;
  terrain: {
    id: string;
    referenceInterne: string;
    nom: string;
    statutCommercial: string;
  };
}

export interface VenteDocument {
  id: string;
  dossierVenteId: string;
  type: string;
  title: string | null;
  isGenerated: boolean;
  isPublic: boolean;
  version: number;
  createdAt: string;
  storageKey: string;
  resourceType: string;
  secureUrl: string;
}

export interface VenteCommission {
  id: string;
  commercialId?: string;
  commercial?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  typeRegle: string;
  taux: number | null;
  montantFixe: number | null;
  palier: number | null;
  bonus: number | null;
  montantEstime: number;
  montantValide: number | null;
  montantPaye: number | null;
  statut: string;
  createdAt: string;
  updatedAt: string;
}

export interface VenteDetail {
  id: string;
  referenceInterne: string | null;
  statut: string;
  prixVente: number | string | null;
  montantPaye: number | null;
  soldeRestant: number | null;
  createdAt: string;
  updatedAt: string;
  prospect: VenteProspect;
  terrain: VenteTerrain | null;
  mandat: { id: string; referenceInterne: string | null; statut: string } | null;
  commercialResponsable: { id: string; firstName: string; lastName: string } | null;
  reservations: VenteReservation[];
  paiements?: VentePaiement[];
  commissions?: VenteCommission[];
  documents: VenteDocument[];
  echeances?: VenteEcheance[];
  _count: { documents: number; commissions: number };
}

export interface VenteDashboardStats {
  totalDossiers: number;
  dossiersParStatut: Record<string, number>;
  totalPaiementsValides: number;
  totalCommissionsEstimees: number;
  totalCommissionsValidees: number;
  totalCommissionsPayees: number;
  ventesRecentes: {
    id: string;
    referenceInterne: string | null;
    statut: string;
    prixVente: number | string | null;
    createdAt: string;
    prospect: { nom: string; prenom: string | null };
    terrain: { nom: string | null } | null;
  }[];
}

export interface VenteDocumentSearchItem {
  id: string;
  dossierVenteId: string;
  type: string;
  title: string | null;
  isGenerated: boolean;
  isPublic: boolean;
  version: number;
  createdAt: string;
  storageKey: string;
  resourceType: string;
  secureUrl?: string;
}

export interface VenteEcheance {
  id: string;
  dossierVenteId: string;
  numero: number;
  dateEcheance: string;
  montantPrevu: number | string;
  montantPaye: number | string;
  statut: string;
  createdAt: string;
}
