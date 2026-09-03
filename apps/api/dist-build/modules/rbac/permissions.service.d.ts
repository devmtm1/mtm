import { PrismaService } from '../../database/prisma.service';
export declare class PermissionsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        id: string;
        action: string;
        createdAt: Date;
        name: string;
        description: string | null;
        resource: string;
    }[]>;
    findByResource(resource: string): Promise<{
        id: string;
        action: string;
        createdAt: Date;
        name: string;
        description: string | null;
        resource: string;
    }[]>;
}
