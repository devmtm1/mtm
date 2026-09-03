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
}
