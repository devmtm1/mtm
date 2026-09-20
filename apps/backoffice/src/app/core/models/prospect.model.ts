export interface CommercialSummary {
  id: string;
  firstName: string;
  lastName: string;
}

export interface ActiviteCrmItem {
  id: string;
  type: string;
  titre: string;
  description: string | null;
  dateEcheance: string | null;
  dateRealisation: string | null;
  statut: string;
  priorite: string;
  createdAt: string;
}

export interface DocumentCrmItem {
  id: string;
  type: string;
  title: string | null;
  isPublic: boolean;
  url: string | null;
  version: number;
  createdAt: string;
}

export interface DossierVenteSummary {
  id: string;
  referenceInterne: string;
  statut: string;
  createdAt: string;
  terrain?: {
    id: string;
    referenceInterne: string;
    nom: string;
  };
  mandat?: {
    id: string;
    referenceInterne: string;
  };
}

export interface TerrainSummary {
  id: string;
  referenceInterne: string;
  nom: string;
  region?: string | null;
  commune?: string | null;
  superficie?: number | null;
  prixPublic?: number | null;
  statutJuridique?: string | null;
  statutCommercial?: string | null;
}

/** Terrain proposé à un prospect : rendez-vous de visite et retour du client. */
export interface VisiteProspectItem {
  id: string;
  statut: string;
  terrain: TerrainSummary;
  dateProposee: string | null;
  dateConfirmee: string | null;
  heure: string | null;
  lieuRendezVous: string | null;
  fraisVisite: number | null;
  fraisPayes: boolean;
  accompagnateur: CommercialSummary | null;
  motifNonEffectuee: string | null;
  dateRetour: string | null;
  terrainPlait: string | null;
  prixAccepte: string | null;
  objectionPrincipale: string | null;
  commentaireClient: string | null;
  souhaiteAutreTerrain: boolean;
  createdAt: string;
}

export interface ProspectListItem {
  id: string;
  referenceInterne: string | null;
  nom: string;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  whatsapp: boolean;
  niveauInteret: string | null;
  zoneRecherchee: string | null;
  prochaineAction: string | null;
  prochaineRelanceLe: string | null;
  statutPipeline: string;
  score: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
  sourceAcquisition: string | null;
  commercialResponsable: CommercialSummary | null;
  /** Liste : la prochaine action « à faire » uniquement. Fiche : toutes. */
  activites?: ActiviteCrmItem[];
  _count: { activites: number; documents: number; dossiers: number; visites: number };
  createdAt: string;
}

export interface ProspectDetail extends ProspectListItem {
  villeResidence: string | null;
  paysResidence: string | null;
  besoins: string | null;
  preferences: string | null;
  surfaceSouhaitee: number | null;
  typeDocumentSouhaite: string | null;
  objectifAchat: string | null;
  premierContactLe: string | null;
  premierContactMoyen: string | null;
  motifSortie: string | null;
  terrainChoisiId: string | null;
  terrainChoisi: TerrainSummary | null;
  offreClient: number | null;
  prixNegocie: number | null;
  commentaireNegociation: string | null;
  activites: ActiviteCrmItem[];
  visites: VisiteProspectItem[];
  documents: DocumentCrmItem[];
  dossiers: DossierVenteSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface Prospect360 {
  prospect: ProspectDetail;
  relatedProspects: { id: string }[];
  relatedActivites: ActiviteCrmItem[];
  relatedDocuments: DocumentCrmItem[];
  relatedDossiers: DossierVenteSummary[];
  relatedAudits: AuditHistoryItem[];
  dossiers: DossierVenteSummary[];
}

export interface ProspectPage {
  items: ProspectListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProspectQuery {
  search?: string;
  commercialResponsableId?: string;
  statutPipeline?: string;
  sourceAcquisition?: string;
  zoneRecherchee?: string;
  niveauInteret?: string;
  /** Vue rapide : à relancer, en retard, sans action, visites à venir, actifs. */
  vue?: string;
  dateMin?: string;
  dateMax?: string;
  page?: number;
  pageSize?: number;
}

export interface ProspectOptions {
  pipelineStages: string[];
  activiteTypes: string[];
  activiteStats: string[];
  priorites: string[];
  sourcesAcquisition: string[];
  niveauxInteret: string[];
  objections: string[];
  closedStages: string[];
  exitStages: string[];
  moyensContact: string[];
  objectifsAchat: string[];
  typesDocumentSouhaite: string[];
  statutsVisite: string[];
  motifsNonVisite: string[];
  appreciationsTerrain: string[];
  prixAccepte: string[];
}

export interface ProspectStats {
  totalProspects: number;
  nouveaux: number;
  aContacter: number;
  relancesDuJour: number;
  relancesEnRetard: number;
  sansProchaineAction: number;
  visitesProgrammees: number;
  visitesRealisees: number;
  retoursASaisir: number;
  enReflexion: number;
  negociations: number;
  reservations: number;
  ventesConclues: number;
  montantVentes: number;
  dossiersSoldes: number;
  tauxConversion: number;
  upcomingTasksCount: number;
  pipeline: Record<string, number>;
  parCommercial: PerformanceCommercial[];
}

export interface PerformanceCommercial {
  id: string;
  nom: string;
  prospects: number;
  enCours: number;
  ventesConclues: number;
  montantVentes: number;
  tauxConversion: number;
}

/** Visite à venir, telle que listée dans l'agenda du commercial. */
export interface UpcomingVisite extends VisiteProspectItem {
  prospect: {
    id: string;
    referenceInterne: string | null;
    nom: string;
    prenom: string | null;
    telephone: string | null;
  };
}

export interface UpcomingTask {
  id: string;
  titre: string;
  dateEcheance: string | null;
  priorite: string;
  statut: string;
  prospect: { id: string; nom: string; prenom: string | null; statutPipeline: string };
}

export interface ProspectTimeline {
  prospect: ProspectDetail | null;
  upcoming: { id: string; titre: string; dateEcheance: string | null; priorite: string }[];
  overdue: { id: string; titre: string; dateEcheance: string | null; priorite: string }[];
  activites: { id: string; titre: string; statut: string; dateEcheance: string | null }[];
  audits: { id: string; action: string; createdAt: string; user: { firstName: string; lastName: string } | null }[];
  dossiers: {
    id: string;
    referenceInterne: string;
    statut: string;
    createdAt: string;
    terrain?: { referenceInterne: string; nom?: string } | null;
    mandat?: { referenceInterne: string } | null;
  }[];
}

export interface CreateProspectPayload {
  nom: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  whatsapp?: boolean;
  villeResidence?: string;
  paysResidence?: string;
  sourceAcquisition?: string;
  niveauInteret?: string;
  besoins?: string;
  zoneRecherchee?: string;
  surfaceSouhaitee?: number;
  typeDocumentSouhaite?: string;
  objectifAchat?: string;
  budgetMin?: number;
  budgetMax?: number;
  preferences?: string;
  premierContactLe?: string;
  premierContactMoyen?: string;
  prochaineAction?: string;
  prochaineRelanceLe?: string;
  terrainChoisiId?: string;
  offreClient?: number;
  prixNegocie?: number;
  commentaireNegociation?: string;
  commercialResponsableId?: string;
  statutPipeline?: string;
  score?: number;
}

export interface VisiteProspectPayload {
  terrainId?: string;
  statut?: string;
  dateProposee?: string;
  dateConfirmee?: string;
  heure?: string;
  lieuRendezVous?: string;
  fraisVisite?: number;
  fraisPayes?: boolean;
  accompagnateurId?: string;
  motifNonEffectuee?: string;
  dateRetour?: string;
  terrainPlait?: string;
  prixAccepte?: string;
  objectionPrincipale?: string;
  commentaireClient?: string;
  souhaiteAutreTerrain?: boolean;
}

export interface CreateActiviteCrmPayload {
  type: string;
  titre: string;
  description?: string;
  dateEcheance?: string;
  dateRealisation?: string;
  statut?: string;
  priorite?: string;
}

export interface AuditHistoryItem {
  id: string;
  action: string;
  oldValue: unknown;
  newValue: unknown;
  justification: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string } | null;
}
