export declare class QueryTerrainDto {
    search?: string;
    statutJuridique?: string;
    niveauVerification?: string;
    statutCommercial?: string;
    misEnAvant?: boolean;
    region?: string;
    commune?: string;
    proprietaireId?: string;
    superficieMin?: number;
    superficieMax?: number;
    prixPublicMin?: number;
    prixPublicMax?: number;
    page: number;
    pageSize: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
}
