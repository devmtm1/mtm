export interface PublicTerrainMedia {
    id: string;
    type: string;
    title: string | null;
    isPublic: boolean;
    sortOrder: number;
    secureUrl: string;
    capturedAt: string | null;
    createdAt: string;
}
export interface PublicTerrainDocument {
    id: string;
    type: string;
    title: string | null;
    isPublic: boolean;
    version: number;
    secureUrl: string;
    createdAt: string;
}
export interface PublicTerrainResponse {
    id: string;
    referenceInterne: string;
    nom: string;
    statutJuridique: string;
    niveauVerification: string;
    region: string | null;
    commune: string | null;
    localisationDetail: string | null;
    latitude: number | null;
    longitude: number | null;
    superficie: number | null;
    uniteSuperficie: string | null;
    dimensions: Record<string, unknown> | null;
    prixPublic: number | null;
    misEnAvant: boolean;
    accesRoutier: string | null;
    eauDisponible: boolean | null;
    electriciteDisponible: boolean | null;
    voisinage: string | null;
    vocation: string | null;
    proximiteAxes: string | null;
    pointsInteret: Record<string, unknown> | null;
    medias: PublicTerrainMedia[];
    documents: PublicTerrainDocument[];
    createdAt: string;
    updatedAt: string;
}
