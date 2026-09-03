import type { AuthenticatedUser } from '../auth/auth.types';
import { ContentBlockService } from './content-block.service';
import { CreateContentBlockDto } from './dto/create-content-block.dto';
import { UpdateContentBlockDto } from './dto/update-content-block.dto';
export declare class ContentBlockController {
    private readonly content;
    constructor(content: ContentBlockService);
    findAll(type?: string): Promise<{
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
    create(dto: CreateContentBlockDto, user: AuthenticatedUser): Promise<{
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
    update(key: string, dto: UpdateContentBlockDto, user: AuthenticatedUser): Promise<{
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
