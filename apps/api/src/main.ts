import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { requestContextMiddleware } from './common/request-context/request-context';
import { AppModule } from './app.module';
import type { AppConfig } from './config/app.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const appCfg = configService.get<AppConfig>('app')!;
  const isProduction = appCfg.nodeEnv === 'production';

  // Derrière un reverse proxy (Render, Cloudflare, nginx…), l'adresse du
  // visiteur arrive dans X-Forwarded-For. Sans cette directive, req.ip vaut
  // l'adresse du proxy pour tout le monde : le rate limiting des formulaires
  // publics bloquerait tous les visiteurs ensemble et le journal d'audit
  // enregistrerait une IP unique. « 1 » = un seul proxy de confiance devant l'API.
  if (isProduction) app.set('trust proxy', 1);

  // En-têtes de sécurité HTTP (HSTS, nosniff, referrer, frameguard…). La CSP
  // est laissée aux sites (Cloudflare Pages) : l'API ne sert que du JSON.
  app.use(
    helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }),
  );

  // Préfixe global : toutes les routes sont sous /api
  // (le versioning d'URL n'est pas activé en Phase 0 pour rester simple ;
  // à réévaluer si un besoin de coexistence de versions apparaît)
  app.setGlobalPrefix('api');

  // Cookies httpOnly pour le refresh token
  app.use(cookieParser());

  // Contexte de requête (IP, navigateur) pour le journal d'audit.
  app.use(requestContextMiddleware);

  // CORS restreint au back-office
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || appCfg.corsOrigin === '*') {
        callback(null, true);
        return;
      }
      const allowed = appCfg.corsOrigin.split(',').map((s) => s.trim());
      if (appCfg.nodeEnv !== 'production') {
        allowed.push('http://localhost:5173', 'http://127.0.0.1:5173');
      }
      if (allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  // Validation stricte de tous les DTOs entrants
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // supprime les propriétés non déclarées dans le DTO
      forbidNonWhitelisted: true, // rejette la requête si propriété inconnue
      transform: true, // transforme les payloads en instances de classe typées
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Documentation Swagger : hors production uniquement — elle décrit toute la
  // surface d'attaque de l'API, sans valeur pour un visiteur du site public.
  if (!isProduction) {
    setupSwagger(app, appCfg.port);
  }

  await app.listen(appCfg.port, '0.0.0.0');
  console.log(`API démarrée sur http://localhost:${appCfg.port}/api`);
}

function setupSwagger(app: NestExpressApplication, port: number): void {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('MTM Immobilier — API')
    .setDescription(
      'API backend de la plateforme MTM Immobilier — Phase 1 (cœur commercial)',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);
  console.log(`Swagger disponible sur http://localhost:${port}/api/docs`);
}

void bootstrap();
