import { PrismaService } from '../../database/prisma.service';
import { CreateContentBlockDto } from './dto/create-content-block.dto';
import { UpdateContentBlockDto } from './dto/update-content-block.dto';
export declare class ContentBlockService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        type: string;
        title: string | null;
        key: string;
        content: string;
    }[]>;
    findByKey(key: string): Promise<{
        type: string;
        title: string | null;
        key: string;
        content: string;
    }>;
    findByType(type: string): Promise<{
        type: string;
        title: string | null;
        key: string;
        content: string;
    }[]>;
    private readonly publicSelect;
    create(dto: CreateContentBlockDto, userId: string): Promise<{
        id: string;
        createdAt: Date;
        isActive: boolean;
        updatedAt: Date;
        type: string;
        title: string | null;
        key: string;
        updatedById: string | null;
        content: string;
        ordre: number;
    }>;
    update(key: string, dto: UpdateContentBlockDto, userId: string): Promise<{
        id: string;
        createdAt: Date;
        isActive: boolean;
        updatedAt: Date;
        type: string;
        title: string | null;
        key: string;
        updatedById: string | null;
        content: string;
        ordre: number;
    }>;
    remove(key: string): Promise<void>;
}
