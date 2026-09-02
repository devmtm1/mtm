import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import { authenticator } from 'otplib';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { FakePrismaService } from './fakes/fake-prisma.service';

/**
 * Test e2e du parcours CRM J1.5 :
 *  - création de prospect
 *  - transition pipeline
 *  - ajout d'activité
 *  - vue 360°
 *  - assignation commercial
 *  - conversion contact → prospect
 */
describe('Parcours CRM J1.5 (e2e)', () => {
  let app: INestApplication;
  let fakePrisma: FakePrismaService;

  const ADMIN_PASSWORD = 'AdminPassword123!';
  const ADMIN_2FA_SECRET = 'JBSWY3DPEHPK3PXP';
  let adminEmail: string;
  let accessToken: string;
  let prospectId: string;

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
    const permissionNames = [
      'crm:consulter',
      'crm:creer',
      'crm:modifier',
      'crm:supprimer',
      'users:consulter',
      'roles:consulter',
      'audit:consulter',
    ];
    for (const name of permissionNames) {
      const permission = fakePrisma.seedPermission(name);
      fakePrisma.linkRolePermission(adminRole.id, permission.id);
    }

    fakePrisma.seedSystemSetting({
      key: 'crm.pipelineStages',
      value: [
        'nouveau_contact',
        'qualification',
        'proposition',
        'visite',
        'negociation',
        'reservation',
        'vente',
        'perdu',
      ],
    });
    fakePrisma.seedSystemSetting({
      key: 'crm.activiteTypes',
      value: ['appel', 'rendez-vous', 'tache', 'relance', 'email', 'note'],
    });
    fakePrisma.seedSystemSetting({
      key: 'crm.activiteStats',
      value: ['a_faire', 'realise', 'reporte', 'annule'],
    });
    fakePrisma.seedSystemSetting({
      key: 'crm.priorites',
      value: ['basse', 'moyenne', 'haute'],
    });
    fakePrisma.seedSystemSetting({
      key: 'crm.documentTypes',
      value: [
        'contrat',
        'avenant',
        'preuve_signature',
        'correspondance',
        'justificatif',
        'autre',
      ],
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
    expect(response.body.requiresTwoFactor).toBe(false);
    expect(response.body.accessToken).toEqual(expect.any(String));
    accessToken = response.body.accessToken;
  });

  it('étape 2 — création d’un prospect', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/crm/prospects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        nom: 'Dupont',
        prenom: 'Jean',
        email: 'jean.dupont@example.com',
        telephone: '77000000',
        paysResidence: 'Sénégal',
        sourceAcquisition: 'Site public',
        besoins: 'Terrain pour construction',
        budgetMin: 5000000,
        budgetMax: 10000000,
        preferences: 'Proche de la mer',
        commercialResponsableId: null,
        statutPipeline: 'nouveau_contact',
        score: 50,
      });

    expect(response.status).toBe(201);
    expect(response.body.nom).toBe('Dupont');
    expect(response.body.prenom).toBe('Jean');
    expect(response.body.paysResidence).toBe('Sénégal');
    expect(response.body.statutPipeline).toBe('nouveau_contact');
    prospectId = response.body.id;
  });

  it('étape 3 — transition pipeline vers qualification', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/crm/prospects/${prospectId}/pipeline`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ statutPipeline: 'qualification' });

    expect(response.status).toBe(200);
    expect(response.body.statutPipeline).toBe('qualification');
  });

  it('étape 4 — transition pipeline vers perdu avec justification', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/crm/prospects/${prospectId}/pipeline`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ statutPipeline: 'perdu', justification: 'Budget non confirmé' });

    expect(response.status).toBe(200);
    expect(response.body.statutPipeline).toBe('perdu');
  });

  it('rejette la transition vers perdu sans justification', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/crm/prospects/${prospectId}/pipeline`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ statutPipeline: 'perdu' });

    expect(response.status).toBe(400);
  });

  it('étape 5 — ajout d’une activité', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/crm/prospects/${prospectId}/activites`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'rendez-vous',
        titre: 'Visite du terrain',
        description: 'RDV à 14h',
        dateEcheance: '2026-09-10',
        statut: 'a_faire',
        priorite: 'haute',
      });

    expect(response.status).toBe(201);
    expect(response.body.titre).toBe('Visite du terrain');
    expect(response.body.type).toBe('rendez-vous');
  });

  it('étape 6 — vue 360° retourne les données agrégées', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/crm/prospects/${prospectId}/360`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.prospect).toBeDefined();
    expect(response.body.relatedActivites).toBeDefined();
    expect(response.body.relatedDocuments).toBeDefined();
    expect(response.body.relatedDossiers).toBeDefined();
    expect(response.body.relatedAudits).toBeDefined();
    expect(response.body.dossiers).toBeDefined();
  });

  it('étape 7 — assignation d’un commercial', async () => {
    const commercialRole = fakePrisma.seedRole('commercial');
    const commercialUser = fakePrisma.seedUser({
      email: 'commercial@mtm-immobilier.sn',
      password: await bcrypt.hash('password', 4),
      firstName: 'Fatou',
      lastName: 'Diop',
    });
    fakePrisma.linkUserRole(commercialUser.id, commercialRole.id);
    fakePrisma.linkRolePermission(
      commercialRole.id,
      fakePrisma.seedPermission('crm:consulter').id,
    );

    const response = await request(app.getHttpServer())
      .patch(`/api/crm/prospects/${prospectId}/assign-commercial`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ commercialResponsableId: commercialUser.id });

    expect(response.status).toBe(200);
    expect(response.body.commercialResponsableId).toBe(commercialUser.id);
  });

  it('étape 8 — conversion contact public → prospect', async () => {
    const contactId = randomUUID();
    const contact = fakePrisma.createContact({
      id: contactId,
      nom: 'Aminata Diallo',
      email: 'aminata@example.com',
      telephone: '76000000',
      sujet: 'Achat',
      message: 'Je cherche un terrain à Dakar',
    });

    const response = await request(app.getHttpServer())
      .post(`/api/crm/prospects/contacts/${contact.id}/convert`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(201);
    expect(response.body.nom).toBe('Diallo');
    expect(response.body.prenom).toBe('Aminata');
    expect(response.body.email).toBe('aminata@example.com');
    expect(response.body.statutPipeline).toBe('nouveau_contact');
  });

  it('liste les prospects avec pagination', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/crm/prospects?page=1&pageSize=10')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.items).toBeDefined();
    expect(response.body.total).toBeGreaterThanOrEqual(1);
    expect(response.body.page).toBe(1);
    expect(response.body.pageSize).toBe(10);
  });

  it('récupère les statistiques CRM', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/crm/prospects/stats')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.totalProspects).toBeGreaterThanOrEqual(1);
    expect(response.body.pipeline).toBeDefined();
  });

  it('récupère les options CRM', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/crm/prospects/options')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.pipelineStages).toContain('nouveau_contact');
    expect(response.body.activiteTypes).toContain('rendez-vous');
  });

  it('archive les actions dans le journal d’audit', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/audit')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    const actions = response.body.items.map(
      (i: { action: string }) => i.action,
    );
    expect(actions).toContain('prospect.created');
    expect(actions).toContain('prospect.pipeline.transition');
  });
});
