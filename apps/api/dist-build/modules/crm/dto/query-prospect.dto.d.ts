export declare class QueryProspectDto {
    search?: string;
    commercialResponsableId?: string;
    statutPipeline?: string;
    sourceAcquisition?: string;
    dateMin?: string;
    dateMax?: string;
    page: number;
    pageSize: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
}
