import { PrismaService } from '../../database/prisma.service';
export interface RecordAuditInput {
    userId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    oldValue?: unknown;
    newValue?: unknown;
    justification?: string;
    ipAddress?: string;
    userAgent?: string;
}
export interface AuditQueryFilters {
    userId?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    from?: Date;
    to?: Date;
}
export interface Pagination {
    page?: number;
    pageSize?: number;
}
export declare class AuditService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    record(input: RecordAuditInput): Promise<void>;
    findAll(filters: AuditQueryFilters, pagination?: Pagination): Promise<{
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
            oldValue: import("@prisma/client/runtime/library").JsonValue | null;
            newValue: import("@prisma/client/runtime/library").JsonValue | null;
            justification: string | null;
            ipAddress: string | null;
            userAgent: string | null;
            mandatId: string | null;
            prospectId: string | null;
            createdAt: Date;
        })[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    }>;
    private toJson;
    private serialize;
}
