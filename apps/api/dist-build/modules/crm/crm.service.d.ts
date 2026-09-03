import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { CreateProspectDto } from './dto/create-prospect.dto';
import { UpdateProspectDto } from './dto/update-prospect.dto';
import { QueryProspectDto } from './dto/query-prospect.dto';
import { CreateActiviteCrmDto } from './dto/create-activite-crm.dto';
import { UpdateActiviteCrmDto } from './dto/update-activite-crm.dto';
import { CreateDocumentCrmDto } from './dto/create-document-crm.dto';
export declare class CrmService {
    private readonly prisma;
    private readonly audit;
    private readonly cloudinary;
    constructor(prisma: PrismaService, audit: AuditService, cloudinary: CloudinaryService);
    private isManager;
    private assertOwnership;
    private assertCommercialTarget;
    findAll(query: QueryProspectDto, user: {
        id: string;
        roles: string[];
    }): Promise<{
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
            budgetMin: Prisma.Decimal | null;
            budgetMax: Prisma.Decimal | null;
            preferences: string | null;
            commercialResponsableId: string | null;
            statutPipeline: string;
            score: number | null;
        })[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    findOne(id: string, user: {
        id: string;
        roles: string[];
    }): Promise<{
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
        budgetMin: Prisma.Decimal | null;
        budgetMax: Prisma.Decimal | null;
        preferences: string | null;
        commercialResponsableId: string | null;
        statutPipeline: string;
        score: number | null;
    }>;
    findOne360(id: string, user: {
        id: string;
        roles: string[];
    }): Promise<{
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
            budgetMin: Prisma.Decimal | null;
            budgetMax: Prisma.Decimal | null;
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
            oldValue: Prisma.JsonValue | null;
            newValue: Prisma.JsonValue | null;
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
    getOptions(): Promise<{
        pipelineStages: string[];
        activiteTypes: string[];
        activiteStats: string[];
        priorites: string[];
    }>;
    getCommercials(): Promise<{
        id: string;
        firstName: string;
        lastName: string;
        roles: string[];
    }[]>;
    getStats(user: {
        id: string;
        roles: string[];
    }): Promise<{
        totalProspects: number;
        nouveaux: number;
        upcomingTasksCount: number;
        pipeline: Record<string, number>;
    }>;
    getUpcomingTasks(user: {
        id: string;
        roles: string[];
    }, limit?: number): Promise<({
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
    getTimeline(prospectId: string, user: {
        id: string;
        roles: string[];
    }): Promise<{
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
            budgetMin: Prisma.Decimal | null;
            budgetMax: Prisma.Decimal | null;
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
            oldValue: Prisma.JsonValue | null;
            newValue: Prisma.JsonValue | null;
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
    assignCommercial(prospectId: string, commercialResponsableId: string | null, user: {
        id: string;
        roles: string[];
    }): Promise<{
        before: {
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
            budgetMin: Prisma.Decimal | null;
            budgetMax: Prisma.Decimal | null;
            preferences: string | null;
            commercialResponsableId: string | null;
            statutPipeline: string;
            score: number | null;
        };
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
            budgetMin: Prisma.Decimal | null;
            budgetMax: Prisma.Decimal | null;
            preferences: string | null;
            commercialResponsableId: string | null;
            statutPipeline: string;
            score: number | null;
        };
    }>;
    transitionPipeline(id: string, nextStage: string, user: {
        id: string;
        roles: string[];
    }, justification?: string): Promise<{
        before: {
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
            budgetMin: Prisma.Decimal | null;
            budgetMax: Prisma.Decimal | null;
            preferences: string | null;
            commercialResponsableId: string | null;
            statutPipeline: string;
            score: number | null;
        };
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
            budgetMin: Prisma.Decimal | null;
            budgetMax: Prisma.Decimal | null;
            preferences: string | null;
            commercialResponsableId: string | null;
            statutPipeline: string;
            score: number | null;
        };
        justification: string | undefined;
    }>;
    convertContact(contactId: string, commercialResponsableId?: string, user?: {
        id: string;
        roles: string[];
    }): Promise<{
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
        budgetMin: Prisma.Decimal | null;
        budgetMax: Prisma.Decimal | null;
        preferences: string | null;
        commercialResponsableId: string | null;
        statutPipeline: string;
        score: number | null;
    }>;
    create(dto: CreateProspectDto, user: {
        id: string;
        roles: string[];
    }): Promise<{
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
        budgetMin: Prisma.Decimal | null;
        budgetMax: Prisma.Decimal | null;
        preferences: string | null;
        commercialResponsableId: string | null;
        statutPipeline: string;
        score: number | null;
    }>;
    update(id: string, dto: UpdateProspectDto, user: {
        id: string;
        roles: string[];
    }): Promise<{
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
        budgetMin: Prisma.Decimal | null;
        budgetMax: Prisma.Decimal | null;
        preferences: string | null;
        commercialResponsableId: string | null;
        statutPipeline: string;
        score: number | null;
    }>;
    remove(id: string, user: {
        id: string;
        roles: string[];
    }): Promise<void>;
    addActivite(prospectId: string, dto: CreateActiviteCrmDto, user: {
        id: string;
        roles: string[];
    }): Promise<{
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
    updateActivite(prospectId: string, activiteId: string, dto: UpdateActiviteCrmDto, user: {
        id: string;
        roles: string[];
    }): Promise<{
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
    removeActivite(prospectId: string, activiteId: string, user: {
        id: string;
        roles: string[];
    }): Promise<void>;
    addDocument(prospectId: string, dto: CreateDocumentCrmDto, file: Express.Multer.File, user: {
        id: string;
        roles: string[];
    }): Promise<{
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
    removeDocument(prospectId: string, documentId: string, user: {
        id: string;
        roles: string[];
    }): Promise<void>;
    getHistory(prospectId: string, user: {
        id: string;
        roles: string[];
    }): Promise<{
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
    private validatePipeline;
    private validateActiviteType;
    private validateActiviteStatut;
    private validatePriorite;
    private validateFileSize;
    private validateDocumentType;
    private asOptions;
}
