import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import { authenticator } from 'otplib';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { FakePrismaService } from './fakes/fake-prisma.service';

/**
 * Test e2e du parcours Terrains J1.1 / J1.2 :
 *  - création d'une fiche terrain interne
 *  - justification obligatoire sur les champs sensibles (audit Phase 1)
 *  - justification obligatoire sur le changement de statut juridique
 *  - masquage des données financières sans permission dédiée
 *  - catalogue public + filtre par vocation (audit Phase 1)
 *  - non-exposition des champs internes sur la fiche publique
 */
describe('Parcours Terrains J1.1/J1.2 (e2e)', () => {
  let app: INestApplication;
  let fakePrisma: FakePrismaService;

  const ADMIN_PASSWORD = 'AdminPassword123!';
  const ADMIN_2FA_SECRET = 'JBSWY3DPEHPK3PXP';
  let adminEmail: string;
  let accessToken: string;
  let commercialAccessToken: string;
  let commercialUserId: string;
  let terrainId: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://fake:fake@localhost:5432/fake';
    process.env.JWT_ACCESS_SECRET = 'e2e-test-access-secret-min-32-characters';
    process.env.JWT_REFRESH_SECRET =
      'e2e-test-refresh-secret-min-32-characters';
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    process.env.CORS_ORIGIN = 'http://localhost:4200';

    fakePrisma = new FakePrismaService();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(fakePrisma)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    const adminRole = fakePrisma.seedRole('administrateur', true);
    const adminPermissions = [
      'terrains:consulter',
      'terrains:creer',
      'terrains:modifier',
      'terrains:valider',
      'terrains:consulter_financier',
      'audit:consulter',
    ];
    for (const name of adminPermissions) {
      const permission = fakePrisma.seedPermission(name);
      fakePrisma.linkRolePermission(adminRole.id, permission.id);
    }

    fakePrisma.seedSystemSetting({
      key: 'terrains.statutJuridique',
      value: ['Titre foncier', 'Bail', 'Régularisation en cours'],
    });
    fakePrisma.seedSystemSetting({
      key: 'terrains.niveauVerification',
      value: ['Non vérifié', 'En cours', 'Vérifié'],
    });
    fakePrisma.seedSystemSetting({
      key: 'terrains.statutCommercial',
      value: ['Brouillon', 'Disponible', 'Réservé', 'Vendu'],
    });

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 4);
    adminEmail = 'admin@mtm-immobilier.sn';
    const adminUser = fakePrisma.seedUser({
      email: adminEmail,
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'MTM',
      twoFactorEnabled: true,
      twoFactorSecret: ADMIN_2FA_SECRET,
    });
    fakePrisma.linkUserRole(adminUser.id, adminRole.id);

    // Un commercial sans la permission terrains:consulter_financier, pour
    // vérifier le masquage des champs sensibles (prix d'acquisition, marge).
    const commercialRole = fakePrisma.seedRole('commercial');
    fakePrisma.linkRolePermission(
      commercialRole.id,
      fakePrisma.seedPermission('terrains:consulter').id,
    );
    const commercialUser = fakePrisma.seedUser({
      email: 'commercial@mtm-immobilier.sn',
      password: await bcrypt.hash('password', 4),
      firstName: 'Fatou',
      lastName: 'Diop',
    });
    fakePrisma.linkUserRole(commercialUser.id, commercialRole.id);
    commercialUserId = commercialUser.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('étape 1 — connexion de l’administrateur', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: adminEmail,
        password: ADMIN_PASSWORD,
        twoFactorCode: authenticator.generate(ADMIN_2FA_SECRET),
      });

    expect(response.status).toBe(201);
    accessToken = response.body.accessToken;
  });

  it('étape 1bis — connexion du commercial', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'commercial@mtm-immobilier.sn',
        password: 'password',
      });

    expect(response.status).toBe(201);
    commercialAccessToken = response.body.accessToken;
  });

  it('étape 2 — création d’une fiche terrain avec points d’intérêt structurés', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/terrains')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        referenceInterne: 'TER-E2E-001',
        nom: 'Terrain e2e Diamniadio',
        statutJuridique: 'Titre foncier',
        niveauVerification: 'Vérifié',
        region: 'Dakar',
        commune: 'Diamniadio',
        superficie: 600,
        prixAcquisition: 5000000,
        prixPublic: 8000000,
        commission: 200000,
        statutCommercial: 'Disponible',
        vocation: 'residentiel',
        commercialResponsableId: commercialUserId,
        pointsInteret: [
          { nom: 'École primaire', type: 'education', distanceKm: 1.2 },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.referenceInterne).toBe('TER-E2E-001');
    expect(response.body.pointsInteret).toEqual([
      { nom: 'École primaire', type: 'education', distanceKm: 1.2 },
    ]);
    terrainId = response.body.id;
  });

  it('rejette une fiche avec un point d’intérêt mal formé', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/terrains')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        referenceInterne: 'TER-E2E-INVALID',
        nom: 'Terrain invalide',
        statutJuridique: 'Titre foncier',
        niveauVerification: 'Vérifié',
        statutCommercial: 'Disponible',
        pointsInteret: [{ nom: '', latitude: 999 }],
      });

    expect(response.status).toBe(400);
  });

  it('rejette la modification du prix d’acquisition sans justification', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/terrains/${terrainId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ prixAcquisition: 5500000 });

    expect(response.status).toBe(400);
  });

  it('accepte la modification du prix d’acquisition avec justification', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/terrains/${terrainId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        prixAcquisition: 5500000,
        justification: 'Réévaluation suite à négociation avec le propriétaire',
      });

    expect(response.status).toBe(200);
    expect(Number(response.body.prixAcquisition)).toBe(5500000);
  });

  it('rejette le changement de statut juridique sans justification', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/terrains/${terrainId}/juridical-status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ value: 'Bail' });

    expect(response.status).toBe(400);
  });

  it('accepte le changement de statut juridique avec justification', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/terrains/${terrainId}/juridical-status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        value: 'Bail',
        justification: 'Document de titre foncier non encore délivré',
      });

    expect(response.status).toBe(200);
    expect(response.body.statutJuridique).toBe('Bail');
  });

  it('masque les champs financiers pour un commercial sans permission dédiée', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/terrains/${terrainId}`)
      .set('Authorization', `Bearer ${commercialAccessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.prixAcquisition).toBeNull();
    expect(response.body.marge).toBeNull();
    expect(response.body.commission).toBeNull();
  });

  it('expose les champs financiers pour un administrateur habilité', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/terrains/${terrainId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(Number(response.body.prixAcquisition)).toBe(5500000);
  });

  it('étape 3 — catalogue public filtré par vocation', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/terrains/public?vocation=residentiel',
    );

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].id).toBe(terrainId);
  });

  it('le catalogue public filtré sur une autre vocation ne retourne rien', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/terrains/public?vocation=commercial',
    );

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(0);
  });

  it('étape 4 — fiche publique sans donnée interne', async () => {
    const response = await request(app.getHttpServer()).get(
      `/api/terrains/public/${terrainId}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).not.toHaveProperty('prixAcquisition');
    expect(response.body).not.toHaveProperty('marge');
    expect(response.body).not.toHaveProperty('commission');
    expect(response.body).not.toHaveProperty('notesInternes');
    expect(response.body.pointsInteret).toEqual([
      { nom: 'École primaire', type: 'education', distanceKm: 1.2 },
    ]);
  });

  it('récupère les options de statuts', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/terrains/options')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.statutJuridique).toContain('Titre foncier');
  });

  it('archive les modifications sensibles dans le journal d’audit avec justification', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/audit')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    const priceUpdate = response.body.items.find(
      (item: { action: string; justification?: string }) =>
        item.action === 'terrain.updated',
    );
    expect(priceUpdate).toBeDefined();
    expect(priceUpdate.justification).toContain('Réévaluation');
  });
});
