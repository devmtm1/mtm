import { PrismaService } from '../../database/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import type { Contact } from '@prisma/client';
export declare class ContactService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateContactDto): Promise<Contact>;
    findAll(options?: {
        lu?: boolean;
    }): Promise<Contact[]>;
    markRead(id: string): Promise<Contact>;
    convertToProspect(id: string, commercialResponsableId?: string): Promise<{
        id: string;
        nom: string;
        prenom: string | null;
        email: string | null;
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
        createdAt: Date;
        updatedAt: Date;
    }>;
}
