import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async check(): Promise<HealthStatus> {
    const database = await this.checkDatabase();
    const storage = this.checkStorage();
    const auth = this.checkAuth();

    const hasCriticalFailure = database === 'down' || auth === 'down';

    return {
      status: hasCriticalFailure ? 'error' : 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database,
      storage,
      auth,
    };
  }

  private async checkDatabase(): Promise<'up' | 'down'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'up';
    } catch (error) {
      this.logger.error('Échec du ping base de données', error);
      return 'down';
    }
  }

  private checkStorage(): 'up' | 'down' | 'skipped' {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const cloudName = this.configService.get('CLOUDINARY_CLOUD_NAME');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const apiKey = this.configService.get('CLOUDINARY_API_KEY');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const apiSecret = this.configService.get('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      return 'skipped';
    }

    try {
      const configured = !!cloudName && !!apiKey && !!apiSecret;
      return configured ? 'up' : 'down';
    } catch (error) {
      this.logger.error('Échec du vérification du stockage', error);
      return 'down';
    }
  }

  private checkAuth(): 'up' | 'down' {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const accessSecret = this.configService.get('JWT_ACCESS_SECRET');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const refreshSecret = this.configService.get('JWT_REFRESH_SECRET');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!accessSecret || accessSecret.length < 32) {
      this.logger.error('JWT_ACCESS_SECRET manquant ou trop court');
      return 'down';
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!refreshSecret || refreshSecret.length < 32) {
      this.logger.error('JWT_REFRESH_SECRET manquant ou trop court');
      return 'down';
    }

    return 'up';
  }
}
