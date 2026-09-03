import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
export interface HealthStatus {
    status: 'ok' | 'error';
    timestamp: string;
    uptime: number;
    database: 'up' | 'down';
    storage: 'up' | 'down' | 'skipped';
    auth: 'up' | 'down';
}
export declare class HealthService {
    private readonly prisma;
    private readonly configService;
    private readonly cloudinaryService;
    private readonly logger;
    constructor(prisma: PrismaService, configService: ConfigService, cloudinaryService: CloudinaryService);
    check(): Promise<HealthStatus>;
    private checkDatabase;
    private checkStorage;
    private checkAuth;
}
