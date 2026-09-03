import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { CreateMandatDto } from './dto/create-mandat.dto';
import { UpdateMandatDto } from './dto/update-mandat.dto';
import { QueryMandatDto } from './dto/query-mandat.dto';
import { CreateMandatLotDto } from './dto/create-mandat-lot.dto';
import { UpdateMandatLotDto } from './dto/update-mandat-lot.dto';
import { CreateMandatDocumentDto } from './dto/create-mandat-document.dto';
export declare class MandatsService {
    private readonly prisma;
    private readonly audit;
    private readonly cloudinary;
    constructor(prisma: PrismaService, audit: AuditService, cloudinary: CloudinaryService);
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
                    superficie: Prisma.Decimal | null;
                    prixPublic: Prisma.Decimal | null;
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
            restrictionsContractuelles: Prisma.JsonValue | null;
            objectifsCommercialisation: string | null;
            alerteEcheanceJours: number | null;
            statut: string;
        })[];
        total: number;
        page: number;
        pageSize: number;
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
                superficie: Prisma.Decimal | null;
                prixPublic: Prisma.Decimal | null;
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
        restrictionsContractuelles: Prisma.JsonValue | null;
        objectifsCommercialisation: string | null;
        alerteEcheanceJours: number | null;
        statut: string;
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
    private computeGlobalFinancials;
    private computeFinancials;
    getExpirants(jours?: number): Promise<({
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
        restrictionsContractuelles: Prisma.JsonValue | null;
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
    create(dto: CreateMandatDto): Promise<{
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
                superficie: Prisma.Decimal | null;
                prixPublic: Prisma.Decimal | null;
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
        restrictionsContractuelles: Prisma.JsonValue | null;
        objectifsCommercialisation: string | null;
        alerteEcheanceJours: number | null;
        statut: string;
    }>;
    update(id: string, dto: UpdateMandatDto): Promise<{
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
                superficie: Prisma.Decimal | null;
                prixPublic: Prisma.Decimal | null;
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
        restrictionsContractuelles: Prisma.JsonValue | null;
        objectifsCommercialisation: string | null;
        alerteEcheanceJours: number | null;
        statut: string;
    }>;
    remove(id: string): Promise<void>;
    addLot(mandatId: string, dto: CreateMandatLotDto): Promise<{
        terrain: {
            id: string;
            nom: string;
            referenceInterne: string;
            region: string | null;
            commune: string | null;
            superficie: Prisma.Decimal | null;
            prixPublic: Prisma.Decimal | null;
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
    updateLot(mandatId: string, lotId: string, dto: UpdateMandatLotDto): Promise<{
        terrain: {
            id: string;
            nom: string;
            referenceInterne: string;
            region: string | null;
            commune: string | null;
            superficie: Prisma.Decimal | null;
            prixPublic: Prisma.Decimal | null;
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
    removeLot(mandatId: string, lotId: string): Promise<void>;
    addDocument(mandatId: string, dto: CreateMandatDocumentDto, file: Express.Multer.File): Promise<{
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
    removeDocument(mandatId: string, documentId: string): Promise<void>;
    getHistory(mandatId: string): Promise<{
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
            oldValue: Prisma.JsonValue | null;
            newValue: Prisma.JsonValue | null;
            justification: string | null;
            ipAddress: string | null;
            userAgent: string | null;
            mandatId: string | null;
            prospectId: string | null;
            createdAt: Date;
        })[];
        total: number;
    }>;
    private ensureExists;
    private validateStatus;
    private validateFileSize;
    private validateDocumentType;
    private toInternal;
    private asOptions;
}
