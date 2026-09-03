import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { CreateProspectDto } from './dto/create-prospect.dto';
import { QueryProspectDto } from './dto/query-prospect.dto';
import { UpdateProspectDto } from './dto/update-prospect.dto';
import { CreateActiviteCrmDto } from './dto/create-activite-crm.dto';
import { UpdateActiviteCrmDto } from './dto/update-activite-crm.dto';
import { CreateDocumentCrmDto } from './dto/create-document-crm.dto';
import { TransitionPipelineDto } from './dto/transition-pipeline.dto';
import { ConvertContactDto } from './dto/convert-contact.dto';
import { CrmService } from './crm.service';
export declare class CrmController {
    private readonly crm;
    private readonly audit;
    constructor(crm: CrmService, audit: AuditService);
    findAll(query: QueryProspectDto, user: AuthenticatedUser): Promise<{
        items: ({
            _count: {
                activites: number;
                documents: number;
                dossiers: number;
            };
            commercialResponsable: {
                id: string;
                firstName: string;
                lastName: string;
            } | null;
            activites: {
                id: string;
                prospectId: string;
                createdAt: Date;
                updatedAt: Date;
                statut: string;
                type: string;
                titre: string;
                description: string | null;
                dateEcheance: Date | null;
                dateRealisation: Date | null;
                priorite: string;
            }[];
            documents: {
                id: string;
                prospectId: string;
                createdAt: Date;
                type: string;
                storageKey: string;
                resourceType: string;
                title: string | null;
                isPublic: boolean;
                url: string | null;
                version: number;
            }[];
            dossiers: ({
                mandat: {
                    id: string;
                    referenceInterne: string;
                } | null;
                terrain: {
                    id: string;
                    nom: string;
                    referenceInterne: string;
                } | null;
            } & {
                id: string;
                mandatId: string | null;
                prospectId: string;
                createdAt: Date;
                updatedAt: Date;
                statut: string;
                terrainId: string | null;
            })[];
        } & {
            id: string;
            createdAt: Date;
            email: string | null;
            updatedAt: Date;
            nom: string;
            prenom: string | null;
            telephone: string | null;
            paysResidence: string | null;
            sourceAcquisition: string | null;
            besoins: string | null;
            budgetMin: import("@prisma/client/runtime/library").Decimal | null;
            budgetMax: import("@prisma/client/runtime/library").Decimal | null;
            preferences: string | null;
            commercialResponsableId: string | null;
            statutPipeline: string;
            score: number | null;
        })[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    getOptions(): Promise<{
        pipelineStages: string[];
        activiteTypes: string[];
        activiteStats: string[];
        priorites: string[];
    }>;
    getStats(user: AuthenticatedUser): Promise<{
        totalProspects: number;
        nouveaux: number;
        upcomingTasksCount: number;
        pipeline: Record<string, number>;
    }>;
    getCommercials(): Promise<{
        id: string;
        firstName: string;
        lastName: string;
        roles: string[];
    }[]>;
    upcomingTasks(user: AuthenticatedUser, limit?: string): Promise<({
        prospect: {
            id: string;
            nom: string;
            prenom: string | null;
            commercialResponsableId: string | null;
            statutPipeline: string;
        };
    } & {
        id: string;
        prospectId: string;
        createdAt: Date;
        updatedAt: Date;
        statut: string;
        type: string;
        titre: string;
        description: string | null;
        dateEcheance: Date | null;
        dateRealisation: Date | null;
        priorite: string;
    })[]>;
    getTimeline(id: string, user: AuthenticatedUser): Promise<{
        prospect: ({
            commercialResponsable: {
                id: string;
                firstName: string;
                lastName: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            email: string | null;
            updatedAt: Date;
            nom: string;
            prenom: string | null;
            telephone: string | null;
            paysResidence: string | null;
            sourceAcquisition: string | null;
            besoins: string | null;
            budgetMin: import("@prisma/client/runtime/library").Decimal | null;
            budgetMax: import("@prisma/client/runtime/library").Decimal | null;
            preferences: string | null;
            commercialResponsableId: string | null;
            statutPipeline: string;
            score: number | null;
        }) | null;
        upcoming: {
            id: string;
            prospectId: string;
            createdAt: Date;
            updatedAt: Date;
            statut: string;
            type: string;
            titre: string;
            description: string | null;
            dateEcheance: Date | null;
            dateRealisation: Date | null;
            priorite: string;
        }[];
        overdue: {
            id: string;
            prospectId: string;
            createdAt: Date;
            updatedAt: Date;
            statut: string;
            type: string;
            titre: string;
            description: string | null;
            dateEcheance: Date | null;
            dateRealisation: Date | null;
            priorite: string;
        }[];
        activites: {
            id: string;
            prospectId: string;
            createdAt: Date;
            updatedAt: Date;
            statut: string;
            type: string;
            titre: string;
            description: string | null;
            dateEcheance: Date | null;
            dateRealisation: Date | null;
            priorite: string;
        }[];
        audits: ({
            user: {
                id: string;
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
        dossiers: ({
            mandat: {
                id: string;
                referenceInterne: string;
            } | null;
            terrain: {
                id: string;
                nom: string;
                referenceInterne: string;
            } | null;
        } & {
            id: string;
            mandatId: string | null;
            prospectId: string;
            createdAt: Date;
            updatedAt: Date;
            statut: string;
            terrainId: string | null;
        })[];
    }>;
    transitionPipeline(id: string, dto: TransitionPipelineDto, user: AuthenticatedUser, req: Request): Promise<{
        _count: {
            activites: number;
            documents: number;
            dossiers: number;
        };
        commercialResponsable: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        activites: {
            id: string;
            prospectId: string;
            createdAt: Date;
            updatedAt: Date;
            statut: string;
            type: string;
            titre: string;
            description: string | null;
            dateEcheance: Date | null;
            dateRealisation: Date | null;
            priorite: string;
        }[];
        documents: {
            id: string;
            prospectId: string;
            createdAt: Date;
            type: string;
            storageKey: string;
            resourceType: string;
            title: string | null;
            isPublic: boolean;
            url: string | null;
            version: number;
        }[];
        dossiers: ({
            mandat: {
                id: string;
                referenceInterne: string;
            } | null;
            terrain: {
                id: string;
                nom: string;
                referenceInterne: string;
            } | null;
        } & {
            id: string;
            mandatId: string | null;
            prospectId: string;
            createdAt: Date;
            updatedAt: Date;
            statut: string;
            terrainId: string | null;
        })[];
    } & {
        id: string;
        createdAt: Date;
        email: string | null;
        updatedAt: Date;
        nom: string;
        prenom: string | null;
        telephone: string | null;
        paysResidence: string | null;
        sourceAcquisition: string | null;
        besoins: string | null;
        budgetMin: import("@prisma/client/runtime/library").Decimal | null;
        budgetMax: import("@prisma/client/runtime/library").Decimal | null;
        preferences: string | null;
        commercialResponsableId: string | null;
        statutPipeline: string;
        score: number | null;
    }>;
    convertContact(contactId: string, dto: ConvertContactDto, user: AuthenticatedUser, req: Request): Promise<{
        _count: {
            activites: number;
            documents: number;
            dossiers: number;
        };
        commercialResponsable: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        activites: {
            id: string;
            prospectId: string;
            createdAt: Date;
            updatedAt: Date;
            statut: string;
            type: string;
            titre: string;
            description: string | null;
            dateEcheance: Date | null;
            dateRealisation: Date | null;
            priorite: string;
        }[];
        documents: {
            id: string;
            prospectId: string;
            createdAt: Date;
            type: string;
            storageKey: string;
            resourceType: string;
            title: string | null;
            isPublic: boolean;
            url: string | null;
            version: number;
        }[];
        dossiers: ({
            mandat: {
                id: string;
                referenceInterne: string;
            } | null;
            terrain: {
                id: string;
                nom: string;
                referenceInterne: string;
            } | null;
        } & {
            id: string;
            mandatId: string | null;
            prospectId: string;
            createdAt: Date;
            updatedAt: Date;
            statut: string;
            terrainId: string | null;
        })[];
    } & {
        id: string;
        createdAt: Date;
        email: string | null;
        updatedAt: Date;
        nom: string;
        prenom: string | null;
        telephone: string | null;
        paysResidence: string | null;
        sourceAcquisition: string | null;
        besoins: string | null;
        budgetMin: import("@prisma/client/runtime/library").Decimal | null;
        budgetMax: import("@prisma/client/runtime/library").Decimal | null;
        preferences: string | null;
        commercialResponsableId: string | null;
        statutPipeline: string;
        score: number | null;
    }>;
    assignCommercial(id: string, commercialResponsableId: string | null, user: AuthenticatedUser, req: Request): Promise<{
        _count: {
            activites: number;
            documents: number;
            dossiers: number;
        };
        commercialResponsable: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        activites: {
            id: string;
            prospectId: string;
            createdAt: Date;
            updatedAt: Date;
            statut: string;
            type: string;
            titre: string;
            description: string | null;
            dateEcheance: Date | null;
            dateRealisation: Date | null;
            priorite: string;
        }[];
        documents: {
            id: string;
            prospectId: string;
            createdAt: Date;
            type: string;
            storageKey: string;
            resourceType: string;
            title: string | null;
            isPublic: boolean;
            url: string | null;
            version: number;
        }[];
        dossiers: ({
            mandat: {
                id: string;
                referenceInterne: string;
            } | null;
            terrain: {
                id: string;
                nom: string;
                referenceInterne: string;
            } | null;
        } & {
            id: string;
            mandatId: string | null;
            prospectId: string;
            createdAt: Date;
            updatedAt: Date;
            statut: string;
            terrainId: string | null;
        })[];
    } & {
        id: string;
        createdAt: Date;
        email: string | null;
        updatedAt: Date;
        nom: string;
        prenom: string | null;
        telephone: string | null;
        paysResidence: string | null;
        sourceAcquisition: string | null;
        besoins: string | null;
        budgetMin: import("@prisma/client/runtime/library").Decimal | null;
        budgetMax: import("@prisma/client/runtime/library").Decimal | null;
        preferences: string | null;
        commercialResponsableId: string | null;
        statutPipeline: string;
        score: number | null;
    }>;
    findOne(id: string, user: AuthenticatedUser): Promise<{
        _count: {
            activites: number;
            documents: number;
            dossiers: number;
        };
        commercialResponsable: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        activites: {
            id: string;
            prospectId: string;
            createdAt: Date;
            updatedAt: Date;
            statut: string;
            type: string;
            titre: string;
            description: string | null;
            dateEcheance: Date | null;
            dateRealisation: Date | null;
            priorite: string;
        }[];
        documents: {
            id: string;
            prospectId: string;
            createdAt: Date;
            type: string;
            storageKey: string;
            resourceType: string;
            title: string | null;
            isPublic: boolean;
            url: string | null;
            version: number;
        }[];
        dossiers: ({
            mandat: {
                id: string;
                referenceInterne: string;
            } | null;
            terrain: {
                id: string;
                nom: string;
                referenceInterne: string;
            } | null;
        } & {
            id: string;
            mandatId: string | null;
            prospectId: string;
            createdAt: Date;
            updatedAt: Date;
            statut: string;
            terrainId: string | null;
        })[];
    } & {
        id: string;
        createdAt: Date;
        email: string | null;
        updatedAt: Date;
        nom: string;
        prenom: string | null;
        telephone: string | null;
        paysResidence: string | null;
        sourceAcquisition: string | null;
        besoins: string | null;
        budgetMin: import("@prisma/client/runtime/library").Decimal | null;
        budgetMax: import("@prisma/client/runtime/library").Decimal | null;
        preferences: string | null;
        commercialResponsableId: string | null;
        statutPipeline: string;
        score: number | null;
    }>;
    find360(id: string, user: AuthenticatedUser): Promise<{
        prospect: {
            _count: {
                activites: number;
                documents: number;
                dossiers: number;
            };
            commercialResponsable: {
                id: string;
                firstName: string;
                lastName: string;
            } | null;
            activites: {
                id: string;
                prospectId: string;
                createdAt: Date;
                updatedAt: Date;
                statut: string;
                type: string;
                titre: string;
                description: string | null;
                dateEcheance: Date | null;
                dateRealisation: Date | null;
                priorite: string;
            }[];
            documents: {
                id: string;
                prospectId: string;
                createdAt: Date;
                type: string;
                storageKey: string;
                resourceType: string;
                title: string | null;
                isPublic: boolean;
                url: string | null;
                version: number;
            }[];
            dossiers: ({
                mandat: {
                    id: string;
                    referenceInterne: string;
                } | null;
                terrain: {
                    id: string;
                    nom: string;
                    referenceInterne: string;
                } | null;
            } & {
                id: string;
                mandatId: string | null;
                prospectId: string;
                createdAt: Date;
                updatedAt: Date;
                statut: string;
                terrainId: string | null;
            })[];
        } & {
            id: string;
            createdAt: Date;
            email: string | null;
            updatedAt: Date;
            nom: string;
            prenom: string | null;
            telephone: string | null;
            paysResidence: string | null;
            sourceAcquisition: string | null;
            besoins: string | null;
            budgetMin: import("@prisma/client/runtime/library").Decimal | null;
            budgetMax: import("@prisma/client/runtime/library").Decimal | null;
            preferences: string | null;
            commercialResponsableId: string | null;
            statutPipeline: string;
            score: number | null;
        };
        relatedProspects: {
            id: string;
        }[];
        relatedActivites: never[] | ({
            prospect: {
                id: string;
                nom: string;
                prenom: string | null;
                statutPipeline: string;
            };
        } & {
            id: string;
            prospectId: string;
            createdAt: Date;
            updatedAt: Date;
            statut: string;
            type: string;
            titre: string;
            description: string | null;
            dateEcheance: Date | null;
            dateRealisation: Date | null;
            priorite: string;
        })[];
        relatedDocuments: never[] | ({
            prospect: {
                id: string;
                nom: string;
                prenom: string | null;
                statutPipeline: string;
            };
        } & {
            id: string;
            prospectId: string;
            createdAt: Date;
            type: string;
            storageKey: string;
            resourceType: string;
            title: string | null;
            isPublic: boolean;
            url: string | null;
            version: number;
        })[];
        relatedDossiers: never[] | ({
            mandat: {
                id: string;
                referenceInterne: string;
            } | null;
            prospect: {
                id: string;
                nom: string;
                prenom: string | null;
                statutPipeline: string;
            };
            terrain: {
                id: string;
                nom: string;
                referenceInterne: string;
            } | null;
        } & {
            id: string;
            mandatId: string | null;
            prospectId: string;
            createdAt: Date;
            updatedAt: Date;
            statut: string;
            terrainId: string | null;
        })[];
        relatedAudits: never[] | ({
            user: {
                id: string;
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
        dossiers: ({
            mandat: {
                id: string;
                referenceInterne: string;
            } | null;
            terrain: {
                id: string;
                nom: string;
                referenceInterne: string;
            } | null;
        } & {
            id: string;
            mandatId: string | null;
            prospectId: string;
            createdAt: Date;
            updatedAt: Date;
            statut: string;
            terrainId: string | null;
        })[];
    }>;
    getHistory(id: string, user: AuthenticatedUser): Promise<{
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
    create(dto: CreateProspectDto, user: AuthenticatedUser, req: Request): Promise<{
        _count: {
            activites: number;
            documents: number;
            dossiers: number;
        };
        commercialResponsable: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        activites: {
            id: string;
            prospectId: string;
            createdAt: Date;
            updatedAt: Date;
            statut: string;
            type: string;
            titre: string;
            description: string | null;
            dateEcheance: Date | null;
            dateRealisation: Date | null;
            priorite: string;
        }[];
        documents: {
            id: string;
            prospectId: string;
            createdAt: Date;
            type: string;
            storageKey: string;
            resourceType: string;
            title: string | null;
            isPublic: boolean;
            url: string | null;
            version: number;
        }[];
        dossiers: ({
            mandat: {
                id: string;
                referenceInterne: string;
            } | null;
            terrain: {
                id: string;
                nom: string;
                referenceInterne: string;
            } | null;
        } & {
            id: string;
            mandatId: string | null;
            prospectId: string;
            createdAt: Date;
            updatedAt: Date;
            statut: string;
            terrainId: string | null;
        })[];
    } & {
        id: string;
        createdAt: Date;
        email: string | null;
        updatedAt: Date;
        nom: string;
        prenom: string | null;
        telephone: string | null;
        paysResidence: string | null;
        sourceAcquisition: string | null;
        besoins: string | null;
        budgetMin: import("@prisma/client/runtime/library").Decimal | null;
        budgetMax: import("@prisma/client/runtime/library").Decimal | null;
        preferences: string | null;
        commercialResponsableId: string | null;
        statutPipeline: string;
        score: number | null;
    }>;
    update(id: string, dto: UpdateProspectDto, user: AuthenticatedUser, req: Request): Promise<{
        _count: {
            activites: number;
            documents: number;
            dossiers: number;
        };
        commercialResponsable: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        activites: {
            id: string;
            prospectId: string;
            createdAt: Date;
            updatedAt: Date;
            statut: string;
            type: string;
            titre: string;
            description: string | null;
            dateEcheance: Date | null;
            dateRealisation: Date | null;
            priorite: string;
        }[];
        documents: {
            id: string;
            prospectId: string;
            createdAt: Date;
            type: string;
            storageKey: string;
            resourceType: string;
            title: string | null;
            isPublic: boolean;
            url: string | null;
            version: number;
        }[];
        dossiers: ({
            mandat: {
                id: string;
                referenceInterne: string;
            } | null;
            terrain: {
                id: string;
                nom: string;
                referenceInterne: string;
            } | null;
        } & {
            id: string;
            mandatId: string | null;
            prospectId: string;
            createdAt: Date;
            updatedAt: Date;
            statut: string;
            terrainId: string | null;
        })[];
    } & {
        id: string;
        createdAt: Date;
        email: string | null;
        updatedAt: Date;
        nom: string;
        prenom: string | null;
        telephone: string | null;
        paysResidence: string | null;
        sourceAcquisition: string | null;
        besoins: string | null;
        budgetMin: import("@prisma/client/runtime/library").Decimal | null;
        budgetMax: import("@prisma/client/runtime/library").Decimal | null;
        preferences: string | null;
        commercialResponsableId: string | null;
        statutPipeline: string;
        score: number | null;
    }>;
    remove(id: string, user: AuthenticatedUser, req: Request): Promise<{
        success: boolean;
    }>;
    addActivite(id: string, dto: CreateActiviteCrmDto, user: AuthenticatedUser, req: Request): Promise<{
        id: string;
        prospectId: string;
        createdAt: Date;
        updatedAt: Date;
        statut: string;
        type: string;
        titre: string;
        description: string | null;
        dateEcheance: Date | null;
        dateRealisation: Date | null;
        priorite: string;
    }>;
    updateActivite(id: string, activiteId: string, dto: UpdateActiviteCrmDto, user: AuthenticatedUser, req: Request): Promise<{
        id: string;
        prospectId: string;
        createdAt: Date;
        updatedAt: Date;
        statut: string;
        type: string;
        titre: string;
        description: string | null;
        dateEcheance: Date | null;
        dateRealisation: Date | null;
        priorite: string;
    }>;
    removeActivite(id: string, activiteId: string, user: AuthenticatedUser, req: Request): Promise<{
        success: boolean;
    }>;
    addDocument(id: string, dto: CreateDocumentCrmDto, file: Express.Multer.File | undefined, user: AuthenticatedUser): Promise<{
        id: string;
        prospectId: string;
        createdAt: Date;
        type: string;
        storageKey: string;
        resourceType: string;
        title: string | null;
        isPublic: boolean;
        url: string | null;
        version: number;
    }>;
    removeDocument(id: string, documentId: string, user: AuthenticatedUser): Promise<{
        success: boolean;
    }>;
}
