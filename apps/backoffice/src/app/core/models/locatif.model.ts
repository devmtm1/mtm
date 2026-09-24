/** Modèles de la gestion locative (J2.1, section 15 du cahier des charges). */

export interface LocatifPersonne {
  id: string;
  firstName: string | null;
  lastName: string | null;
}

export interface BienProprietaire {
  id: string;
  firstName: string;
  lastName: string;
}

export interface BailLocataireResume {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone?: string | null;
}

/** Bail actif résumé, tel qu'affiché dans la liste des biens. */
export interface BailResume {
  id: string;
  referenceInterne: string | null;
  statut: string;
  dateDebut: string;
  loyerMensuel: number | string;
  locataire: BailLocataireResume;
}

export interface BienListItem {
  id: string;
  referenceInterne: string;
  type: string;
  adresse: string;
  commune: string | null;
  region: string | null;
  superficie: number | string | null;
  statut: string;
  notes: string | null;
  proprietaire: BienProprietaire;
  responsable: LocatifPersonne | null;
  baux: BailResume[];
  createdAt: string;
  updatedAt: string;
}

export interface BienDetail extends BienListItem {
  createdBy: LocatifPersonne | null;
}

export interface EcheanceLoyer {
  id: string;
  periode: string;
  dateEcheance: string;
  montantPrevu: number | string;
  montantPaye: number | string;
  statut: string;
}

export interface PaiementLoyer {
  id: string;
  type: string;
  montant: number | string;
  datePaiement: string;
  modePaiement: string;
  reference: string | null;
  notes: string | null;
  /** en_attente | valide | rejete : le contrôle des encaissements (section 24). */
  statut: string;
  recordedBy: LocatifPersonne | null;
  validatedBy: LocatifPersonne | null;
  validatedAt: string | null;
  echeance: { id: string; periode: string } | null;
}

/** Solde d'un bail, recalculé côté API (section 15). */
export interface SoldeBail {
  loyersDus: number;
  loyersEncaisses: number;
  solde: number;
  echeancesImpayees: number;
  joursRetardMax: number;
  encaissementsEnAttente: number;
}

/** Une ligne de l'historique de caution (section 15). */
export interface MouvementCaution {
  id: string;
  type: string;
  montant: number | string;
  date: string;
  justification: string | null;
  recordedBy?: LocatifPersonne | null;
}

export interface EtatCaution {
  montantInitial: number;
  verse: number;
  retenu: number;
  rembourse: number;
  disponible: number;
  statut: string;
}

export interface CautionBail {
  etat: EtatCaution;
  mouvements: MouvementCaution[];
}

/** Calcul de régularisation de sortie proposé par l'API (section 15). */
export interface Regularisation extends SoldeBail {
  avanceReportee: number;
  caution: EtatCaution;
  resteDu: number;
  retenueCautionProposee: number;
  cautionARembourserProposee: number;
  montantPropose: number;
}

/** Relance de loyer issue du calendrier paramétré (section 15). */
export interface RelanceLoyer {
  id: string;
  modeleCode: string;
  joursRetard: number;
  canal: string;
  destinataire: string | null;
  objet: string;
  message: string;
  statut: string;
  envoyeeLe: string | null;
  createdAt: string;
  envoyeeBy?: LocatifPersonne | null;
  echeance: {
    id: string;
    periode: string;
    dateEcheance?: string;
    montantPrevu?: number | string;
    montantPaye?: number | string;
    statut?: string;
  } | null;
  bailLocatif?: {
    id: string;
    referenceInterne: string | null;
    situationPaiement: string;
    locataire: { id: string; firstName: string | null; lastName: string | null; email: string | null };
    bienLocatif: { id: string; referenceInterne: string; adresse: string };
  };
}

export interface IncidentLocatif {
  id: string;
  /** incident | demande (sections 4 et 15). */
  nature: string;
  type: string;
  description: string;
  statut: string;
  resolutionNotes: string | null;
  reportedBy: LocatifPersonne | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface DocumentLocatif {
  id: string;
  type: string;
  title: string | null;
  isGenerated: boolean;
  /** Deux visibilités distinctes : le locataire et le propriétaire n'ont pas les mêmes pièces. */
  visibleLocataire: boolean;
  visibleProprietaire: boolean;
  version: number;
  createdAt: string;
  createdBy: LocatifPersonne | null;
  secureUrl: string;
}

export interface Locataire {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  _count?: { baux: number };
}

/** Bail vu depuis la fiche locataire : le bien loué, tous baux confondus. */
export interface LocataireBail {
  id: string;
  referenceInterne: string | null;
  statut: string;
  dateDebut: string;
  dateFin: string | null;
  dateSortieReelle: string | null;
  loyerMensuel: number | string;
  bienLocatif: {
    id: string;
    referenceInterne: string;
    adresse: string;
    commune: string | null;
  };
}

export interface BailDetail {
  id: string;
  referenceInterne: string | null;
  bienLocatifId: string;
  locataire: Locataire;
  loyerMensuel: number | string;
  charges: number | string | null;
  jourEcheance: number;
  /** a_jour | retard | impaye_prolonge, recalculé (cas « impayé prolongé »). */
  situationPaiement: string;
  dateDebut: string;
  dateFin: string | null;
  cautionMontant: number | string | null;
  cautionDate: string | null;
  cautionStatut: string;
  cautionRetenue: number | string | null;
  cautionJustification: string | null;
  cautionRembourseeLe: string | null;
  cautionRembourseeMontant: number | string | null;
  statut: string;
  preavisDonneLe: string | null;
  preavisDepartPrevu: string | null;
  etatLieuxEntree: string | null;
  etatLieuxSortie: string | null;
  dateSortieReelle: string | null;
  regularisationMontant: number | string | null;
  regularisationNotes: string | null;
  motifCloture: string | null;
  createdBy: LocatifPersonne | null;
  echeances: EcheanceLoyer[];
  incidents: IncidentLocatif[];
  mouvementsCaution?: MouvementCaution[];
}

export interface BienPage {
  items: BienListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BienQuery {
  search?: string;
  statut?: string;
  type?: string;
  proprietaireId?: string;
  responsableId?: string;
  vue?: string;
  page?: number;
  pageSize?: number;
}

export interface ModeleRelance {
  code: string;
  libelle: string;
  joursRetard: number;
  canal: string;
  objet: string;
  message: string;
}

export interface LocatifOptions {
  typesBien: string[];
  statutsBien: string[];
  statutsBail: string[];
  situationsPaiement: string[];
  statutsCaution: string[];
  typesPaiement: string[];
  statutsPaiement: string[];
  modesPaiement: string[];
  statutsEcheance: string[];
  typesMouvementCaution: string[];
  typesIncident: string[];
  typesDemande: string[];
  statutsIncident: string[];
  typesDocument: string[];
  relanceSeuilJours: number;
  impayeProlongeJours: number;
  horizonEcheancesMois: number;
  relanceModeles: ModeleRelance[];
}

export interface LocatifStats {
  total: number;
  loues: number;
  disponibles: number;
  sansResponsable: number;
  /** Biens concernés par au moins un loyer en retard. */
  biensEnRetard: number;
  /** Échéances effectivement en retard, tous biens confondus. */
  echeancesEnRetard: number;
  impayesProlonges: number;
  loyersEncaissesMois: number;
  encaissementsEnAttente: number;
  impayesTotal: number;
}

export interface CreateBienPayload {
  proprietaireId: string;
  type: string;
  adresse: string;
  commune?: string;
  region?: string;
  superficie?: number;
  notes?: string;
  responsableId?: string;
}

export type UpdateBienPayload = Partial<Omit<CreateBienPayload, 'proprietaireId'>> & {
  proprietaireId?: string;
  statut?: string;
};

export interface CreateBailPayload {
  locataireId: string;
  loyerMensuel: number;
  charges?: number;
  jourEcheance?: number;
  dateDebut: string;
  dateFin?: string;
  cautionMontant?: number;
  cautionDate?: string;
  etatLieuxEntree?: string;
}

/**
 * Correction d'un bail. La caution passe par ses mouvements (section 15) :
 * seul le montant prévu au contrat se modifie ici.
 */
export interface UpdateBailPayload {
  loyerMensuel?: number;
  loyerApplicableLe?: string;
  charges?: number;
  dateFin?: string | null;
  etatLieuxEntree?: string;
  cautionMontant?: number;
}

export interface CreateMouvementCautionPayload {
  type: string;
  montant: number;
  date?: string;
  justification?: string;
}

export interface RejetPaiementPayload {
  motif: string;
}

export interface EnvoyerRelancePayload {
  canal?: string;
  note?: string;
}

export interface GenererRelevePayload {
  periodeDebut?: string;
  periodeFin?: string;
}

export interface VisibiliteDocumentPayload {
  visibleLocataire?: boolean;
  visibleProprietaire?: boolean;
}

export interface PreavisPayload {
  preavisDonneLe: string;
  preavisDepartPrevu: string;
}

export interface SortiePayload {
  dateSortieReelle: string;
  motifCloture?: string;
  etatLieuxSortie?: string;
  regularisationMontant?: number;
  regularisationNotes?: string;
  cautionRetenue?: number;
  cautionJustification?: string;
  cautionRembourseeMontant?: number;
}

export interface ResiliationSansPreavisPayload {
  motifCloture: string;
  dateSortieReelle?: string;
}

export interface ChangerLocatairePayload {
  dateSortieReelle: string;
  motifCloture?: string;
  etatLieuxSortie?: string;
  nouveauBail: CreateBailPayload;
}

export interface CreatePaiementPayload {
  type: string;
  montant: number;
  datePaiement?: string;
  modePaiement: string;
  reference?: string;
  notes?: string;
  echeanceId?: string;
}

export interface CreateIncidentPayload {
  nature?: string;
  type: string;
  description: string;
}

export interface UpdateIncidentPayload {
  statut?: string;
  resolutionNotes?: string;
}

export interface CreateLocatairePayload {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export type UpdateLocatairePayload = Partial<CreateLocatairePayload>;
