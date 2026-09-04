import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from './audit.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
export declare class AuditController {
    private readonly auditService;
    constructor(auditService: AuditService);
    findAll(query: QueryAuditLogDto): Promise<{
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
    exportLogs(query: QueryAuditLogDto, justification: string, user: AuthenticatedUser): Promise<({
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
    })[]>;
}
