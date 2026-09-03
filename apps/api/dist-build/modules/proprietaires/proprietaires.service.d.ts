import { PrismaService } from '../../database/prisma.service';
import { CreateProprietaireDto } from './dto/create-proprietaire.dto';
import { UpdateProprietaireDto } from './dto/update-proprietaire.dto';
export declare class ProprietairesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        id: string;
        email: string | null;
        firstName: string;
        lastName: string;
        phone: string | null;
    }[]>;
    findById(id: string): Promise<{
        id: string;
        createdAt: Date;
        email: string | null;
        firstName: string;
        lastName: string;
        updatedAt: Date;
        phone: string | null;
        notes: string | null;
    }>;
    create(dto: CreateProprietaireDto): Promise<{
        id: string;
        createdAt: Date;
        email: string | null;
        firstName: string;
        lastName: string;
        updatedAt: Date;
        phone: string | null;
        notes: string | null;
    }>;
    update(id: string, dto: UpdateProprietaireDto): Promise<{
        id: string;
        createdAt: Date;
        email: string | null;
        firstName: string;
        lastName: string;
        updatedAt: Date;
        phone: string | null;
        notes: string | null;
    }>;
    remove(id: string): Promise<void>;
    private ensureExists;
}
