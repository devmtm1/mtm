export type NumericOrString = number | string | null;

export interface ProprietaireSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
}

export interface MandatListItem {
  id: string;
  referenceInterne: string;
  proprietaire: ProprietaireSummary;
  commercialResponsable: { id: string; firstName: string; lastName: string } | null;
  typeMandat: string;
  dateDebut: string;
  dateFin: string;
  exclusivite: boolean;
  statut: string;
  alerteEcheanceJours: number | null;
  _count: { lots: number; documents: number };
}

export interface MandatLotItem {
  id: string;
  statutLot: string;
  dateAttribution: string;
  terrain: {
    id: string;
    referenceInterne: string;
    nom: string;
    commune: string | null;
    region: string | null;
    superficie: NumericOrString;
    prixPublic: NumericOrString;
    statutCommercial: string;
  };
}

export interface MandatDocumentItem {
  id: string;
  type: string;
  title: string | null;
  isPublic: boolean;
  secureUrl: string;
  version: number;
  createdAt: string;
}

export interface MandatDetail extends MandatListItem {
  prixConditions: string | null;
  commissions: string | null;
  clauses: string | null;
  restrictionsContractuelles: Record<string, unknown> | null;
  objectifsCommercialisation: string | null;
  lots: MandatLotItem[];
  documents: MandatDocumentItem[];
  createdAt: string;
  updatedAt: string;
}

export interface MandatPage {
  items: MandatListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MandatQuery {
  search?: string;
  proprietaireId?: string;
  commercialResponsableId?: string;
  statut?: string;
  dateDebutMin?: string;
  dateDebutMax?: string;
  dateFinMin?: string;
  dateFinMax?: string;
  page?: number;
  pageSize?: number;
}

export interface MandatOptions {
  typeMandat: string[];
  statut: string[];
  statutLot: string[];
}

export interface MandatStats {
  totalMandats: number;
  actifs: number;
  expirant30Jours: number;
  totalLots: number;
  lotsParStatut: Record<string, number>;
  financial: {
    chiffreAffaires: number;
    commissionsEstimees: number;
    resteACommercialiser: number;
  };
}

export interface MandatFinancialSummary {
  mandatId: string;
  chiffreAffaires: number;
  commissionsEstimees: number;
  resteACommercialiser: number;
}

export interface MandatExpirant {
  id: string;
  referenceInterne: string;
  dateFin: string;
  proprietaire: ProprietaireSummary;
  commercialResponsable: { id: string; firstName: string; lastName: string } | null;
  _count: { lots: number };
}

export interface CreateMandatPayload {
  referenceInterne: string;
  proprietaireId: string;
  commercialResponsableId?: string;
  typeMandat: string;
  dateDebut: string;
  dateFin: string;
  exclusivite?: boolean;
  prixConditions?: string;
  commissions?: string;
  clauses?: string;
  restrictionsContractuelles?: Record<string, unknown>;
  objectifsCommercialisation?: string;
  alerteEcheanceJours?: number;
  statut: string;
}

export interface CreateMandatLotPayload {
  terrainId: string;
  statutLot?: string;
}
