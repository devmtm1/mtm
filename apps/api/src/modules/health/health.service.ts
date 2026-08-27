import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  database: 'up' | 'down';
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthStatus> {
    const database = await this.checkDatabase();

    return {
      status: database === 'up' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database,
    };
  }

  private async checkDatabase(): Promise<'up' | 'down'> {
    try {
      // $queryRaw est typé `any` dans ce sandbox faute de `prisma generate`
      // (accès réseau bloqué, voir prisma/PRISMA_NOTES.md).

      await this.prisma.$queryRaw`SELECT 1`;
      return 'up';
    } catch (error) {
      this.logger.error('Échec du ping base de données', error);
      return 'down';
    }
  }
}
