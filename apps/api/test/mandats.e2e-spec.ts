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
 * Test e2e du parcours Mandats J1.4 :
 *  - création d'un mandat et de ses lots
 *  - exclusivité : un terrain déjà couvert par un mandat exclusif actif
 *    ne peut pas être rattaché à un second mandat exclusif actif
 *  - suivi financier (chiffre d'affaires / reste à commercialiser)
 *  - alertes d'échéance
 *  - suppression d'un mandat
 */
describe('Parcours Mandats J1.4 (e2e)', () => {
  let app: INestApplication;
  let fakePrisma: FakePrismaService;

  const ADMIN_PASSWORD = 'AdminPassword123!';
  const ADMIN_2FA_SECRET = 'JBSWY3DPEHPK3PXP';
  let adminEmail: string;
  let accessToken: string;
  let proprietaireId: string;
  let terrainAId: string;
  let terrainBId: string;
  let mandatAId: string;
  let lotAId: string;

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
      'mandats:consulter',
      'mandats:creer',
      'mandats:modifier',
      'mandats:supprimer',
      'mandats:administrer',
      'audit:consulter',
    ];
    for (const name of adminPermissions) {
      const permission = fakePrisma.seedPermission(name);
      fakePrisma.linkRolePermission(adminRole.id, permission.id);
    }

    fakePrisma.seedSystemSetting({
      key: 'mandats.typeMandat',
      value: ['Vente', 'Location', 'Gestion'],
    });
    fakePrisma.seedSystemSetting({
      key: 'mandats.statut',
      value: ['Brouillon', 'Actif', 'Expiré', 'Résilié', 'Clôturé'],
    });
    fakePrisma.seedSystemSetting({
      key: 'mandats.statutLot',
      value: ['Confie', 'Disponible', 'Réservé', 'Vendu'],
    });
    fakePrisma.seedSystemSetting({ key: 'mandats.commissionRate', value: 5 });

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

    const proprietaire = fakePrisma.seedProprietaire({
      firstName: 'Jean',
      lastName: 'Propriétaire',
      email: 'jean@test.sn',
    });
    proprietaireId = proprietaire.id;

    const terrainA = await fakePrisma.terrain.create({
      data: {
        referenceInterne: 'TER-MANDAT-A',
        nom: 'Terrain A',
        proprietaireId,
        statutCommercial: 'Disponible',
        prixPublic: 10000000,
      },
    });
    terrainAId = terrainA.id;

    const terrainB = await fakePrisma.terrain.create({
      data: {
        referenceInterne: 'TER-MANDAT-B',
        nom: 'Terrain B',
        proprietaireId,
        statutCommercial: 'Disponible',
        prixPublic: 6000000,
      },
    });
    terrainBId = terrainB.id;
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

  it('étape 2 — création d’un mandat exclusif actif', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/mandats')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        referenceInterne: 'MAN-E2E-A',
        proprietaireId,
        typeMandat: 'Vente',
        dateDebut: '2026-01-01',
        dateFin: '2030-01-01',
        exclusivite: true,
        statut: 'Actif',
      });

    expect(response.status).toBe(201);
    expect(response.body.exclusivite).toBe(true);
    mandatAId = response.body.id;
  });

  it('étape 3 — rattachement du terrain A comme lot du mandat', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/mandats/${mandatAId}/lots`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ terrainId: terrainAId });

    expect(response.status).toBe(201);
    expect(response.body.terrainId).toBe(terrainAId);
    lotAId = response.body.id;
  });

  it('rejette le rattachement du même terrain à un second mandat exclusif actif', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/mandats')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        referenceInterne: 'MAN-E2E-B',
        proprietaireId,
        typeMandat: 'Vente',
        dateDebut: '2026-01-01',
        dateFin: '2030-01-01',
        exclusivite: true,
        statut: 'Actif',
      });
    expect(createResponse.status).toBe(201);
    const mandatBId = createResponse.body.id;

    const lotResponse = await request(app.getHttpServer())
      .post(`/api/mandats/${mandatBId}/lots`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ terrainId: terrainAId });

    expect(lotResponse.status).toBe(409);
  });

  it('accepte un second terrain non exclusif sur le mandat B', async () => {
    const listResponse = await request(app.getHttpServer())
      .get('/api/mandats?search=MAN-E2E-B')
      .set('Authorization', `Bearer ${accessToken}`);
    const mandatBId = listResponse.body.items[0].id;

    const response = await request(app.getHttpServer())
      .post(`/api/mandats/${mandatBId}/lots`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ terrainId: terrainBId });

    expect(response.status).toBe(201);
  });

  it('étape 4 — suivi financier avant vente', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/mandats/${mandatAId}/financial`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.chiffreAffaires).toBe(0);
    expect(response.body.resteACommercialiser).toBe(10000000);
  });

  it('étape 5 — passage du lot en « Vendu » met à jour le suivi financier', async () => {
    await fakePrisma.terrain.update({
      where: { id: terrainAId },
      data: { statutCommercial: 'Vendu' },
    });

    const response = await request(app.getHttpServer())
      .patch(`/api/mandats/${mandatAId}/lots/${lotAId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ statutLot: 'Vendu' });

    expect(response.status).toBe(200);
    expect(response.body.statutLot).toBe('Vendu');

    const financial = await request(app.getHttpServer())
      .get(`/api/mandats/${mandatAId}/financial`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(financial.body.chiffreAffaires).toBe(10000000);
    expect(financial.body.commissionsEstimees).toBe(500000);
  });

  it('étape 6 — statistiques globales des mandats', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/mandats/stats')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.totalMandats).toBeGreaterThanOrEqual(2);
    expect(response.body.lotsParStatut.Vendu).toBeGreaterThanOrEqual(1);
  });

  it('étape 7 — alerte d’échéance proche', async () => {
    const soonDate = new Date();
    soonDate.setDate(soonDate.getDate() + 5);

    const createResponse = await request(app.getHttpServer())
      .post('/api/mandats')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        referenceInterne: 'MAN-E2E-ALERTE',
        proprietaireId,
        typeMandat: 'Vente',
        dateDebut: '2026-01-01',
        dateFin: soonDate.toISOString().slice(0, 10),
        exclusivite: false,
        alerteEcheanceJours: 30,
        statut: 'Actif',
      });
    expect(createResponse.status).toBe(201);

    const response = await request(app.getHttpServer())
      .post('/api/mandats/alerts/check')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(201);
    const alert = response.body.alerts.find(
      (a: { referenceInterne: string }) =>
        a.referenceInterne === 'MAN-E2E-ALERTE',
    );
    expect(alert).toBeDefined();
    expect(alert.destinataires).toContain('jean@test.sn');
  });

  it('étape 8 — mise à jour du mandat', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/mandats/${mandatAId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ commissions: '5% à la signature' });

    expect(response.status).toBe(200);
    expect(response.body.commissions).toBe('5% à la signature');
  });

  it('étape 9 — suppression du mandat', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/api/mandats/${mandatAId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);

    const getResponse = await request(app.getHttpServer())
      .get(`/api/mandats/${mandatAId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(getResponse.status).toBe(404);
  });

  it('archive la création et la suppression dans le journal d’audit', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/audit')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    const actions = response.body.items.map(
      (i: { action: string }) => i.action,
    );
    expect(actions).toContain('mandat.created');
    expect(actions).toContain('mandat.lot.created');
    expect(actions).toContain('mandat.deleted');
  });
});
