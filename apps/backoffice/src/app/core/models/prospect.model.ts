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

export interface ProspectListItem {
  id: string;
  nom: string;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  statutPipeline: string;
  score: number | null;
  commercialResponsable: CommercialSummary | null;
  _count: { activites: number; documents: number; dossiers: number };
  createdAt: string;
}

export interface ProspectDetail extends ProspectListItem {
  paysResidence: string | null;
  sourceAcquisition: string | null;
  besoins: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  preferences: string | null;
  activites: ActiviteCrmItem[];
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
}

export interface ProspectStats {
  totalProspects: number;
  nouveaux: number;
  upcomingTasksCount: number;
  pipeline: Record<string, number>;
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
  dossiers: { id: string; statut: string; createdAt: string; terrain?: { referenceInterne: string }; mandat?: { referenceInterne: string } }[];
}

export interface CreateProspectPayload {
  nom: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  paysResidence?: string;
  sourceAcquisition?: string;
  besoins?: string;
  budgetMin?: number;
  budgetMax?: number;
  preferences?: string;
  commercialResponsableId?: string;
  statutPipeline?: string;
  score?: number;
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
