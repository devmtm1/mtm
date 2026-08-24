import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import type { AppConfig } from './config/app.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const appCfg = configService.get<AppConfig>('app')!;

  // Préfixe global : toutes les routes sont sous /api
  // (le versioning d'URL n'est pas activé en Phase 0 pour rester simple ;
  // à réévaluer si un besoin de coexistence de versions apparaît)
  app.setGlobalPrefix('api');

  // Cookies httpOnly pour le refresh token
  app.use(cookieParser());

  // CORS restreint au back-office
  app.enableCors({
    origin: appCfg.corsOrigin,
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

  // Documentation Swagger (désactivable en production si besoin)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('MTM Immobilier — API')
    .setDescription(
      'API backend de la plateforme MTM Immobilier — Phase 0 (socle technique)',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  await app.listen(appCfg.port, '0.0.0.0');
  console.log(`API démarrée sur http://localhost:${appCfg.port}/api`);
  console.log(
    `Swagger disponible sur http://localhost:${appCfg.port}/api/docs`,
  );
}

void bootstrap();
