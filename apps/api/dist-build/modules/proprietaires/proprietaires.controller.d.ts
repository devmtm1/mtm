import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { CreateProprietaireDto } from './dto/create-proprietaire.dto';
import { UpdateProprietaireDto } from './dto/update-proprietaire.dto';
import { ProprietairesService } from './proprietaires.service';
export declare class ProprietairesController {
    private readonly proprietaires;
    private readonly audit;
    constructor(proprietaires: ProprietairesService, audit: AuditService);
    findAll(): Promise<{
        id: string;
        email: string | null;
        firstName: string;
        lastName: string;
        phone: string | null;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        createdAt: Date;
        email: string | null;
        firstName: string;
        lastName: string;
        updatedAt: Date;
        phone: string | null;
        notes: string | null;
    }>;
    create(dto: CreateProprietaireDto, user: AuthenticatedUser, req: Request): Promise<{
        id: string;
        createdAt: Date;
        email: string | null;
        firstName: string;
        lastName: string;
        updatedAt: Date;
        phone: string | null;
        notes: string | null;
    }>;
    update(id: string, dto: UpdateProprietaireDto, user: AuthenticatedUser, req: Request): Promise<{
        id: string;
        createdAt: Date;
        email: string | null;
        firstName: string;
        lastName: string;
        updatedAt: Date;
        phone: string | null;
        notes: string | null;
    }>;
    remove(id: string, user: AuthenticatedUser, req: Request): Promise<{
        success: boolean;
    }>;
}
