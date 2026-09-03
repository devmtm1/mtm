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
        createdAt: Date;
        email: string;
        nom: string;
        telephone: string | null;
        terrainId: string | null;
        sujet: string | null;
        message: string;
        lu: boolean;
    }[]>;
    markRead(id: string, user: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        email: string;
        nom: string;
        telephone: string | null;
        terrainId: string | null;
        sujet: string | null;
        message: string;
        lu: boolean;
    }>;
}
