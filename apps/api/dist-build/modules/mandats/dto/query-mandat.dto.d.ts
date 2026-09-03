export declare class QueryMandatDto {
    search?: string;
    proprietaireId?: string;
    commercialResponsableId?: string;
    statut?: string;
    dateDebutMin?: string;
    dateDebutMax?: string;
    dateFinMin?: string;
    dateFinMax?: string;
    page: number;
    pageSize: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
}
