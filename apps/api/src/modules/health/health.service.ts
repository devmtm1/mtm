import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { MailService } from '../../common/mail/mail.service';

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  database: 'up' | 'down';
  storage: 'up' | 'down' | 'skipped';
  auth: 'up' | 'down';
  /** « skipped » hors production sans SMTP ; « down » en production sans SMTP. */
  mail: 'up' | 'down' | 'skipped';
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly mailService: MailService,
  ) {}

  async check(): Promise<HealthStatus> {
    const database = await this.checkDatabase();
    const storage = this.checkStorage();
    const auth = this.checkAuth();
    const mail = await this.checkMail();

    // Sans e-mail en production, la réinitialisation de mot de passe et les
    // notifications de demandes sont hors service : c'est critique.
    const hasCriticalFailure =
      database === 'down' || auth === 'down' || mail === 'down';

    return {
      status: hasCriticalFailure ? 'error' : 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database,
      storage,
      auth,
      mail,
    };
  }

  private async checkMail(): Promise<'up' | 'down' | 'skipped'> {
    if (!this.mailService.isConfigured()) {
      return this.configService.get<string>('NODE_ENV') === 'production'
        ? 'down'
        : 'skipped';
    }
    return (await this.mailService.verify()) ? 'up' : 'down';
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

  /** « skipped » sans identifiants Cloudinary : le stockage n'est pas requis en local. */
  private checkStorage(): 'up' | 'skipped' {
    return this.cloudinaryService.isConfigured() ? 'up' : 'skipped';
  }

  private checkAuth(): 'up' | 'down' {
    for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
      const secret = this.configService.get<string>(key);
      if (!secret || secret.length < 32) {
        this.logger.error(`${key} manquant ou trop court`);
        return 'down';
      }
    }
    return 'up';
  }
}
