import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { CreateMandatDto } from './dto/create-mandat.dto';
import { QueryMandatDto } from './dto/query-mandat.dto';
import { UpdateMandatDto } from './dto/update-mandat.dto';
import { CreateMandatLotDto } from './dto/create-mandat-lot.dto';
import { UpdateMandatLotDto } from './dto/update-mandat-lot.dto';
import { CreateMandatDocumentDto } from './dto/create-mandat-document.dto';
import { MandatsService } from './mandats.service';
export declare class MandatsController {
    private readonly mandats;
    private readonly audit;
    constructor(mandats: MandatsService, audit: AuditService);
    findAll(query: QueryMandatDto): Promise<{
        items: ({
            _count: {
                documents: number;
                lots: number;
            };
            commercialResponsable: {
                id: string;
                firstName: string;
                lastName: string;
            } | null;
            documents: {
                id: string;
                mandatId: string;
                createdAt: Date;
                type: string;
                storageKey: string;
                resourceType: string;
                title: string | null;
                isPublic: boolean;
                version: number;
            }[];
            proprietaire: {
                id: string;
                email: string | null;
                firstName: string;
                lastName: string;
                phone: string | null;
            };
            lots: ({
                terrain: {
                    id: string;
                    nom: string;
                    referenceInterne: string;
                    region: string | null;
                    commune: string | null;
                    superficie: import("@prisma/client/runtime/library").Decimal | null;
                    prixPublic: import("@prisma/client/runtime/library").Decimal | null;
                    statutCommercial: string;
                };
            } & {
                id: string;
                mandatId: string;
                createdAt: Date;
                updatedAt: Date;
                terrainId: string;
                statutLot: string;
                dateAttribution: Date;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            commercialResponsableId: string | null;
            referenceInterne: string;
            proprietaireId: string;
            typeMandat: string;
            dateDebut: Date;
            dateFin: Date;
            exclusivite: boolean;
            prixConditions: string | null;
            commissions: string | null;
            clauses: string | null;
            restrictionsContractuelles: import("@prisma/client/runtime/library").JsonValue | null;
            objectifsCommercialisation: string | null;
            alerteEcheanceJours: number | null;
            statut: string;
        })[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    getOptions(): Promise<{
        typeMandat: string[];
        statut: string[];
        statutLot: string[];
    }>;
    getStats(): Promise<{
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
    }>;
    getFinancialSummary(id: string): Promise<{
        chiffreAffaires: number;
        resteACommercialiser: number;
        commissionsEstimees: number;
        mandatId: string;
    }>;
    getExpirants(jours?: string): Promise<({
        _count: {
            lots: number;
        };
        commercialResponsable: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        proprietaire: {
            id: string;
            email: string | null;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        commercialResponsableId: string | null;
        referenceInterne: string;
        proprietaireId: string;
        typeMandat: string;
        dateDebut: Date;
        dateFin: Date;
        exclusivite: boolean;
        prixConditions: string | null;
        commissions: string | null;
        clauses: string | null;
        restrictionsContractuelles: import("@prisma/client/runtime/library").JsonValue | null;
        objectifsCommercialisation: string | null;
        alerteEcheanceJours: number | null;
        statut: string;
    })[]>;
    checkAlerts(): Promise<{
        generatedAt: string;
        alerts: {
            mandatId: string;
            referenceInterne: string;
            joursRestants: number;
            destinataires: string[];
        }[];
    }>;
    findOne(id: string): Promise<{
        _count: {
            documents: number;
            lots: number;
        };
        commercialResponsable: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        documents: {
            id: string;
            mandatId: string;
            createdAt: Date;
            type: string;
            storageKey: string;
            resourceType: string;
            title: string | null;
            isPublic: boolean;
            version: number;
        }[];
        proprietaire: {
            id: string;
            email: string | null;
            firstName: string;
            lastName: string;
            phone: string | null;
        };
        lots: ({
            terrain: {
                id: string;
                nom: string;
                referenceInterne: string;
                region: string | null;
                commune: string | null;
                superficie: import("@prisma/client/runtime/library").Decimal | null;
                prixPublic: import("@prisma/client/runtime/library").Decimal | null;
                statutCommercial: string;
            };
        } & {
            id: string;
            mandatId: string;
            createdAt: Date;
            updatedAt: Date;
            terrainId: string;
            statutLot: string;
            dateAttribution: Date;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        commercialResponsableId: string | null;
        referenceInterne: string;
        proprietaireId: string;
        typeMandat: string;
        dateDebut: Date;
        dateFin: Date;
        exclusivite: boolean;
        prixConditions: string | null;
        commissions: string | null;
        clauses: string | null;
        restrictionsContractuelles: import("@prisma/client/runtime/library").JsonValue | null;
        objectifsCommercialisation: string | null;
        alerteEcheanceJours: number | null;
        statut: string;
    }>;
    getHistory(id: string): Promise<{
        items: ({
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            } | null;
        } & {
            id: string;
            userId: string | null;
            action: string;
            entityType: string;
            entityId: string | null;
            oldValue: import("@prisma/client/runtime/library").JsonValue | null;
            newValue: import("@prisma/client/runtime/library").JsonValue | null;
            justification: string | null;
            ipAddress: string | null;
            userAgent: string | null;
            mandatId: string | null;
            prospectId: string | null;
            createdAt: Date;
        })[];
        total: number;
    }>;
    create(dto: CreateMandatDto, user: AuthenticatedUser, req: Request): Promise<{
        _count: {
            documents: number;
            lots: number;
        };
        commercialResponsable: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        documents: {
            id: string;
            mandatId: string;
            createdAt: Date;
            type: string;
            storageKey: string;
            resourceType: string;
            title: string | null;
            isPublic: boolean;
            version: number;
        }[];
        proprietaire: {
            id: string;
            email: string | null;
            firstName: string;
            lastName: string;
            phone: string | null;
        };
        lots: ({
            terrain: {
                id: string;
                nom: string;
                referenceInterne: string;
                region: string | null;
                commune: string | null;
                superficie: import("@prisma/client/runtime/library").Decimal | null;
                prixPublic: import("@prisma/client/runtime/library").Decimal | null;
                statutCommercial: string;
            };
        } & {
            id: string;
            mandatId: string;
            createdAt: Date;
            updatedAt: Date;
            terrainId: string;
            statutLot: string;
            dateAttribution: Date;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        commercialResponsableId: string | null;
        referenceInterne: string;
        proprietaireId: string;
        typeMandat: string;
        dateDebut: Date;
        dateFin: Date;
        exclusivite: boolean;
        prixConditions: string | null;
        commissions: string | null;
        clauses: string | null;
        restrictionsContractuelles: import("@prisma/client/runtime/library").JsonValue | null;
        objectifsCommercialisation: string | null;
        alerteEcheanceJours: number | null;
        statut: string;
    }>;
    update(id: string, dto: UpdateMandatDto, user: AuthenticatedUser, req: Request): Promise<{
        _count: {
            documents: number;
            lots: number;
        };
        commercialResponsable: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        documents: {
            id: string;
            mandatId: string;
            createdAt: Date;
            type: string;
            storageKey: string;
            resourceType: string;
            title: string | null;
            isPublic: boolean;
            version: number;
        }[];
        proprietaire: {
            id: string;
            email: string | null;
            firstName: string;
            lastName: string;
            phone: string | null;
        };
        lots: ({
            terrain: {
                id: string;
                nom: string;
                referenceInterne: string;
                region: string | null;
                commune: string | null;
                superficie: import("@prisma/client/runtime/library").Decimal | null;
                prixPublic: import("@prisma/client/runtime/library").Decimal | null;
                statutCommercial: string;
            };
        } & {
            id: string;
            mandatId: string;
            createdAt: Date;
            updatedAt: Date;
            terrainId: string;
            statutLot: string;
            dateAttribution: Date;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        commercialResponsableId: string | null;
        referenceInterne: string;
        proprietaireId: string;
        typeMandat: string;
        dateDebut: Date;
        dateFin: Date;
        exclusivite: boolean;
        prixConditions: string | null;
        commissions: string | null;
        clauses: string | null;
        restrictionsContractuelles: import("@prisma/client/runtime/library").JsonValue | null;
        objectifsCommercialisation: string | null;
        alerteEcheanceJours: number | null;
        statut: string;
    }>;
    remove(id: string, user: AuthenticatedUser, req: Request): Promise<{
        success: boolean;
    }>;
    addLot(id: string, dto: CreateMandatLotDto, user: AuthenticatedUser, req: Request): Promise<{
        terrain: {
            id: string;
            nom: string;
            referenceInterne: string;
            region: string | null;
            commune: string | null;
            superficie: import("@prisma/client/runtime/library").Decimal | null;
            prixPublic: import("@prisma/client/runtime/library").Decimal | null;
            statutCommercial: string;
        };
    } & {
        id: string;
        mandatId: string;
        createdAt: Date;
        updatedAt: Date;
        terrainId: string;
        statutLot: string;
        dateAttribution: Date;
    }>;
    updateLot(id: string, lotId: string, dto: UpdateMandatLotDto, user: AuthenticatedUser, req: Request): Promise<{
        terrain: {
            id: string;
            nom: string;
            referenceInterne: string;
            region: string | null;
            commune: string | null;
            superficie: import("@prisma/client/runtime/library").Decimal | null;
            prixPublic: import("@prisma/client/runtime/library").Decimal | null;
            statutCommercial: string;
        };
    } & {
        id: string;
        mandatId: string;
        createdAt: Date;
        updatedAt: Date;
        terrainId: string;
        statutLot: string;
        dateAttribution: Date;
    }>;
    removeLot(id: string, lotId: string, user: AuthenticatedUser, req: Request): Promise<{
        success: boolean;
    }>;
    addDocument(id: string, dto: CreateMandatDocumentDto, file: Express.Multer.File | undefined, user: AuthenticatedUser): Promise<{
        id: string;
        mandatId: string;
        createdAt: Date;
        type: string;
        storageKey: string;
        resourceType: string;
        title: string | null;
        isPublic: boolean;
        version: number;
    }>;
    removeDocument(id: string, documentId: string, user: AuthenticatedUser): Promise<{
        success: boolean;
    }>;
}
