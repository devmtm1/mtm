import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
export declare class CronService {
    private readonly prisma;
    private readonly audit;
    private readonly logger;
    constructor(prisma: PrismaService, audit: AuditService);
    handleMandatsEcheances(): Promise<void>;
    handleCrmRelances(): Promise<void>;
}
