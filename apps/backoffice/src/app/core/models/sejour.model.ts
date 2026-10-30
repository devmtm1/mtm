import type { Page } from './page';
/** Séjours de courte durée, états des lieux et demandes de résiliation. */

export type StatutSejour = 'demande' | 'confirmee' | 'en_cours' | 'terminee' | 'annulee';

export interface SejourVoyageur {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
}

export interface SejourBien {
  id: string;
  referenceInterne: string;
  titre: string | null;
  type: string;
  commune: string | null;
  adresse: string;
  heureArrivee: string | null;
  heureDepart: string | null;
}

export type StatutReglementSejour = 'non_regle' | 'acompte' | 'solde' | 'trop_percu';

/** Ce qui a été réglé sur le séjour et ce qu'il reste à payer. */
export interface SyntheseSejour {
  montantTotal: number;
  totalRegle: number;
  reste: number;
  excedent: number;
  statut: StatutReglementSejour;
}

export interface SejourListItem {
  id: string;
  referenceInterne: string;
  statut: StatutSejour;
  source: string;
  /** Quand la réservation a été faite. */
  dateReservation: string;
  /** Jours (arrivée, départ) : « 2026-10-15T00:00:00.000Z ». */
  dateArrivee: string;
  dateDepart: string;
  nuits: number;
  nombreVoyageurs: number;
  prixNuit: number | string;
  fraisMenage: number | string;
  remise: number | string;
  montantTotal: number | string;
  cautionMontant: number | string | null;
  /** non_versee | versee | restituee | partiellement_retenue | retenue_totale */
  cautionStatut: string;
  notes: string | null;
  bienLocatif: SejourBien;
  locataire: SejourVoyageur;
  synthese: SyntheseSejour;
}

export interface PaiementSejour {
  id: string;
  datePaiement: string;
  montant: number | string;
  type: string;
  mode: string;
  reference: string | null;
  note: string | null;
}

export type EtatPiece = 'bon' | 'usage' | 'degrade' | 'hors_service';

export interface PieceEtat {
  piece: string;
  etat: EtatPiece;
  observation?: string | null;
}

export interface PhotoEtat {
  id: string;
  legende: string | null;
  url: string;
}

export interface EtatDesLieuxVue {
  id: string;
  type: 'entree' | 'sortie';
  dateEtat: string;
  pieces: PieceEtat[];
  releveEau: string | null;
  releveElectricite: string | null;
  nombreCles: number | null;
  observations: string | null;
  signataire: string | null;
  photos: PhotoEtat[];
}

export interface ComparaisonPiece {
  piece: string;
  avant: EtatPiece | null;
  apres: EtatPiece;
  observation: string | null;
  degradation: boolean;
}

/** Entrée, sortie et ce qui s'est dégradé entre les deux. */
export interface EtatsDesLieux {
  entree: EtatDesLieuxVue | null;
  sortie: EtatDesLieuxVue | null;
  comparaison: ComparaisonPiece[];
  degradations: number;
}

export interface SejourDetail extends SejourListItem {
  cautionVerseeLe: string | null;
  cautionRetenue: number | string | null;
  cautionJustification: string | null;
  cautionRestitueeLe: string | null;
  annuleLe: string | null;
  motifAnnulation: string | null;
  paiements: PaiementSejour[];
  etatsDesLieux: EtatsDesLieux;
}

export interface SejourPage {
  items: SejourListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SejourStats {
  aTraiter: number;
  arriveesProches: number;
  enCours: number;
  cautionsARegler: number;
}

export interface SejourQuery {
  search?: string;
  bienLocatifId?: string;
  statut?: string;
  vue?: string;
  du?: string;
  au?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateSejourPayload {
  bienLocatifId: string;
  locataireId: string;
  dateArrivee: string;
  dateDepart: string;
  dateReservation?: string;
  nombreVoyageurs?: number;
  prixNuit?: number;
  fraisMenage?: number;
  remise?: number;
  cautionMontant?: number;
  source?: string;
  notes?: string;
  statut?: 'demande' | 'confirmee';
}

export type UpdateSejourPayload = Partial<Omit<CreateSejourPayload, 'bienLocatifId' | 'locataireId' | 'statut' | 'dateReservation'>>;

export interface CreatePaiementSejourPayload {
  datePaiement?: string;
  montant: number;
  type?: string;
  mode: string;
  reference?: string;
  note?: string;
}

export interface EtatDesLieuxPayload {
  dateEtat?: string;
  pieces: PieceEtat[];
  releveEau?: string;
  releveElectricite?: string;
  nombreCles?: number;
  observations?: string;
  signataire?: string;
}

// --- Demandes de résiliation ---

export type StatutResiliation = 'en_attente' | 'acceptee' | 'refusee' | 'annulee';

export interface DemandeResiliation {
  id: string;
  bailLocatifId: string;
  canal: string;
  dateDemande: string;
  dateDepartSouhaitee: string;
  motif: string | null;
  message: string | null;
  statut: StatutResiliation;
  dateDepartRetenue: string | null;
  reponse: string | null;
  traiteeLe: string | null;
  bailLocatif: {
    id: string;
    referenceInterne: string;
    statut: string;
    preavisDonneLe: string | null;
    preavisDepartPrevu: string | null;
    bienLocatif: {
      id: string;
      referenceInterne: string;
      titre: string | null;
      type: string;
      adresse: string;
      commune: string | null;
    };
    locataire: { id: string; firstName: string; lastName: string; phone: string | null };
  };
}

export type ResiliationPage = Page<DemandeResiliation>;

export interface ResiliationStats {
  enAttente: number;
  /** Préavis minimal, en jours. */
  preavisJours: number;
}

export interface DemandeResiliationPayload {
  dateDepartSouhaitee: string;
  motif?: string;
  message?: string;
  canal?: string;
  dateDemande?: string;
}

export interface TraiterResiliationPayload {
  decision: 'acceptee' | 'refusee';
  dateDepartRetenue?: string;
  reponse?: string;
}
