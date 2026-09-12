import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { requestContextMiddleware } from '../../src/common/request-context/request-context';
import { e2eDatabaseUrlOrThrow } from './e2e-database';
import { E2eData } from './e2e-data';

export interface E2eContext {
  app: INestApplication;
  prisma: PrismaService;
  /** Fabrique de données de test, écrites dans la vraie base. */
  data: E2eData;
  close(): Promise<void>;
}

/**
 * Démarre l'application complète — même préfixe, mêmes middlewares, même
 * ValidationPipe que `main.ts` — sur la base PostgreSQL de test, vidée au
 * démarrage. Aucune doublure : ce qui passe ici passe en production.
 */
export async function createE2eApp(): Promise<E2eContext> {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = e2eDatabaseUrlOrThrow();
  process.env.JWT_ACCESS_SECRET ??= 'e2e-test-access-secret-min-32-characters';
  process.env.JWT_REFRESH_SECRET ??=
    'e2e-test-refresh-secret-min-32-characters';
  process.env.JWT_ACCESS_EXPIRES_IN ??= '15m';
  process.env.JWT_REFRESH_EXPIRES_IN ??= '7d';
  process.env.CORS_ORIGIN ??= 'http://localhost:4200';

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.use(requestContextMiddleware);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();

  const prisma = moduleRef.get(PrismaService);
  await truncateAll(prisma);

  return {
    app,
    prisma,
    data: new E2eData(prisma),
    close: () => app.close(),
  };
}

/** Vide toutes les tables applicatives (les migrations Prisma sont conservées). */
export async function truncateAll(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%'
      LOOP
        EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', r.tablename);
      END LOOP;
    END $$;
  `);
}
