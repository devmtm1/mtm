export declare class CreateMandatDto {
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
