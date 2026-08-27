import {
  INestApplication,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Service Prisma centralisé. Toute donnée transite par ce service —
 * aucun module ne doit instancier son propre PrismaClient.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    // $connect est typé `any` dans ce sandbox faute de `prisma generate`
    // (accès réseau bloqué, voir prisma/PRISMA_NOTES.md).

    await this.$connect();
    this.logger.log('Connexion à PostgreSQL établie');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Ferme proprement les connexions lors d'un arrêt applicatif
   * (utilisé conjointement avec app.enableShutdownHooks()).
   */
  enableShutdownHooks(app: INestApplication): void {
    process.on('beforeExit', () => {
      void app.close();
    });
  }
}
