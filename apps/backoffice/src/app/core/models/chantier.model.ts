/** Modèles du suivi de chantier (J2.3, section 16 CDC). */

export interface ChantierClient {
  id: string;
  nom: string;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
}

export interface ChantierTerrain {
  id: string;
  nom: string;
  referenceInterne: string | null;
  commune: string | null;
}

export interface ChantierPersonne {
  id: string;
  firstName: string | null;
  lastName: string | null;
}

/** Jalon du planning : c'est lui qui porte le Gantt et les retards. */
export interface JalonChantier {
  id: string;
  libelle: string;
  description: string | null;
  ordre: number;
  poids: number;
  dateDebutPrevue: string | null;
  dateFinPrevue: string | null;
  dateDebutReelle: string | null;
  dateFinReelle: string | null;
  statut: string;
  avancement: number;
}

export interface DocumentChantier {
  id: string;
  entreeJournalId: string | null;
  type: string;
  title: string | null;
  /** « image », « video » ou « raw » : ce qui distingue une photo d'un PDF. */
  resourceType: string;
  isGenerated: boolean;
  visibleClient: boolean;
  version: number;
  secureUrl: string;
  createdBy: ChantierPersonne | null;
  createdAt: string;
}

/** Une journée de chantier, telle que la section 16 la décrit. */
export interface EntreeJournal {
  id: string;
  date: string;
  jalon: { id: string; libelle: string } | null;
  intervenants: string | null;
  effectif: number | null;
  meteo: string | null;
  avancement: number | null;
  observations: string | null;
  probleme: string | null;
  decisions: string | null;
  prochaineAction: string | null;
  resolu: boolean;
  visibleClient: boolean;
  redigePar: ChantierPersonne | null;
  documents: DocumentChantier[];
  createdAt: string;
}

export interface IntervenantChantier {
  id: string;
  nom: string;
  metier: string;
  telephone: string | null;
  email: string | null;
  reference: string | null;
  montantContrat: number | string | null;
  dateDebut: string | null;
  dateFin: string | null;
  statut: string;
  notes: string | null;
  _count?: { depenses: number };
}

export interface LigneBudget {
  id: string;
  poste: string;
  libelle: string;
  quantite: number | string | null;
  unite: string | null;
  prixUnitaire: number | string | null;
  montantPrevu: number | string;
  notes: string | null;
}

export interface DepenseChantier {
  id: string;
  libelle: string;
  poste: string;
  montant: number | string;
  date: string;
  modePaiement: string | null;
  reference: string | null;
  statut: string;
  motifRejet: string | null;
  ligneBudget: { id: string; libelle: string; poste: string } | null;
  intervenant: { id: string; nom: string; metier: string } | null;
  createdBy: ChantierPersonne | null;
  validatedBy: ChantierPersonne | null;
  validatedAt: string | null;
}

/** Ligne de la liste des chantiers. */
export interface ChantierListItem {
  id: string;
  referenceInterne: string;
  intitule: string;
  typeProjet: string;
  adresse: string | null;
  commune: string | null;
  region: string | null;
  statut: string;
  situationAlerte: string;
  avancement: number;
  montantDevis: number | string | null;
  budgetPrevu: number | string | null;
  montantEngage: number | string;
  montantDepense: number | string;
  dateDebutPrevue: string | null;
  dateFinPrevue: string | null;
  dateFinReelle: string | null;
  client: ChantierClient;
  terrain: ChantierTerrain | null;
  responsable: ChantierPersonne | null;
  _count: {
    jalons: number;
    journal: number;
    intervenants: number;
    documents: number;
  };
}

/** Avancement du chantier, déduit de ses jalons. */
export interface AvancementChantier {
  pourcentage: number;
  jalonsTotal: number;
  jalonsTermines: number;
  jalonsEnCours: number;
  jalonsBloques: number;
  jalonsEnRetard: number;
  joursRetardMax: number;
}

/** Consommation du budget, telle que l'API la calcule. */
export interface BudgetChantier {
  montantDevis: number;
  budgetPrevu: number;
  totalLignes: number;
  montantEngage: number;
  montantDepense: number;
  montantEnAttente: number;
  resteAEngager: number;
  tauxConsommation: number;
  margeEstimee: number;
  depassement: boolean;
}

export interface BudgetPoste {
  poste: string;
  prevu: number;
  depense: number;
  enAttente: number;
  ecart: number;
  depassement: boolean;
}

export interface BudgetDetaille extends BudgetChantier {
  parPoste: BudgetPoste[];
}

export interface AlertesChantier {
  situation: string;
  retard: boolean;
  depassementBudget: boolean;
  joursRetardProjet: number;
  jalonsEnRetard: number;
  echeancesProches: number;
  problemesOuverts: number;
}

export interface SyntheseChantier {
  avancement: AvancementChantier;
  budget: BudgetChantier;
  alertes: AlertesChantier;
}

/** Fiche complète d'un chantier. Le journal se charge à part, paginé. */
export interface ChantierDetail extends ChantierListItem {
  programme: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  surfaceBatie: number | string | null;
  nombreNiveaux: number | null;
  dateDebutReelle: string | null;
  visibleClient: boolean;
  notes: string | null;
  createdBy: ChantierPersonne | null;
  createdAt: string;
  updatedAt: string;
  jalons: JalonChantier[];
  intervenants: IntervenantChantier[];
  lignesBudget: LigneBudget[];
  depenses: DepenseChantier[];
  documents: DocumentChantier[];
  synthese: SyntheseChantier;
}

export interface ChantierPage {
  items: ChantierListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface JournalPage {
  items: EntreeJournal[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ChantierStats {
  parStatut: Record<string, number>;
  parAlerte: Record<string, number>;
  chantiersActifs: number;
  avancementMoyen: number;
  montantDevis: number;
  budgetPrevu: number;
  montantEngage: number;
  montantDepense: number;
  problemesOuverts: number;
}

/** Référentiels paramétrables, plus les seuils d'alerte (section 25). */
export interface ChantierOptions {
  statuts: string[];
  typesProjet: string[];
  statutsJalon: string[];
  jalonsType: string[];
  metiers: string[];
  statutsIntervenant: string[];
  postesBudget: string[];
  unites: string[];
  statutsDepense: string[];
  modesPaiement: string[];
  meteos: string[];
  typesDocument: string[];
  reglages: {
    seuilAlerteBudget: number;
    horizonEcheanceJours: number;
    retardCritiqueJours: number;
  };
}

export interface ChantierQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  statut?: string;
  typeProjet?: string;
  situationAlerte?: string;
  responsableId?: string;
  clientId?: string;
  vue?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface JournalQuery {
  page?: number;
  pageSize?: number;
  depuis?: string;
  jusqua?: string;
  vue?: string;
}

export interface CreateChantierPayload {
  clientId: string;
  terrainId?: string;
  intitule: string;
  typeProjet: string;
  programme?: string;
  adresse?: string;
  commune?: string;
  region?: string;
  surfaceBatie?: number;
  nombreNiveaux?: number;
  montantDevis?: number;
  budgetPrevu?: number;
  dateDebutPrevue?: string;
  dateFinPrevue?: string;
  responsableId?: string;
  notes?: string;
  /** Pose d'emblée le déroulé type d'une construction. */
  avecJalonsType?: boolean;
}

export type UpdateChantierPayload = Partial<
  Omit<CreateChantierPayload, 'clientId' | 'avecJalonsType'>
> & {
  dateDebutReelle?: string | null;
  dateFinReelle?: string | null;
  avancement?: number;
  visibleClient?: boolean;
};

export interface JalonPayload {
  libelle?: string;
  description?: string;
  ordre?: number;
  poids?: number;
  dateDebutPrevue?: string | null;
  dateFinPrevue?: string | null;
  dateDebutReelle?: string | null;
  dateFinReelle?: string | null;
  statut?: string;
  avancement?: number;
}

export interface EntreeJournalPayload {
  date?: string;
  jalonId?: string | null;
  intervenants?: string;
  effectif?: number;
  meteo?: string;
  avancement?: number;
  observations?: string;
  probleme?: string;
  decisions?: string;
  prochaineAction?: string;
  resolu?: boolean;
  visibleClient?: boolean;
}

export interface IntervenantPayload {
  nom?: string;
  metier?: string;
  telephone?: string;
  email?: string;
  reference?: string;
  montantContrat?: number;
  dateDebut?: string | null;
  dateFin?: string | null;
  statut?: string;
  notes?: string;
}

export interface LigneBudgetPayload {
  poste?: string;
  libelle?: string;
  quantite?: number;
  unite?: string;
  prixUnitaire?: number;
  montantPrevu?: number;
  notes?: string;
}

export interface DepensePayload {
  libelle: string;
  poste: string;
  montant: number;
  date?: string;
  ligneBudgetId?: string;
  intervenantId?: string;
  modePaiement?: string;
  reference?: string;
}
