import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
export declare class ContactController {
    private readonly contacts;
    private readonly audit;
    constructor(contacts: ContactService, audit: AuditService);
    create(dto: CreateContactDto): Promise<{
        success: boolean;
    }>;
    findAll(lu?: string): Promise<{
        id: string;
        terrainId: string | null;
        nom: string;
        email: string;
        telephone: string | null;
        sujet: string | null;
        message: string;
        lu: boolean;
        createdAt: Date;
    }[]>;
    markRead(id: string, user: AuthenticatedUser): Promise<{
        id: string;
        terrainId: string | null;
        nom: string;
        email: string;
        telephone: string | null;
        sujet: string | null;
        message: string;
        lu: boolean;
        createdAt: Date;
    }>;
    convertToProspect(id: string, commercialResponsableId: string | undefined, user: AuthenticatedUser): Promise<{
        id: string;
        nom: string;
        email: string | null;
        telephone: string | null;
        createdAt: Date;
        prenom: string | null;
        paysResidence: string | null;
        sourceAcquisition: string | null;
        besoins: string | null;
        budgetMin: import("@prisma/client/runtime/library").Decimal | null;
        budgetMax: import("@prisma/client/runtime/library").Decimal | null;
        preferences: string | null;
        commercialResponsableId: string | null;
        statutPipeline: string;
        score: number | null;
        updatedAt: Date;
    }>;
}
