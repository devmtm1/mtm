import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

/** Vérifie le démarrage et les requêtes avec le vrai PrismaService. */
describe('PostgreSQL réel (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await prisma.mandatLot.deleteMany();
    await prisma.mandatDocument.deleteMany();
    await prisma.mandat.deleteMany();
    await prisma.dossierVente.deleteMany();
    await prisma.documentCrm.deleteMany();
    await prisma.activiteCrm.deleteMany();
    await prisma.prospect.deleteMany();
    await prisma.contact.deleteMany();
    await prisma.contentBlock.deleteMany();
    await prisma.systemSetting.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.passwordResetToken.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.terrainDocument.deleteMany();
    await prisma.terrainMedia.deleteMany();
    await prisma.terrain.deleteMany();
    await prisma.proprietaire.deleteMany();
    await prisma.auditLog.deleteMany();
  });

  it('répond au healthcheck avec une requête PostgreSQL réelle', async () => {
    const response = await request(app.getHttpServer()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('ne expose aucun champ interne sur la projection publique des terrains', async () => {
    const proprietaire = await prisma.proprietaire.create({
      data: {
        firstName: 'Jean',
        lastName: 'Propriétaire',
        email: 'jean@test.sn',
      },
    });

    const terrain = await prisma.terrain.create({
      data: {
        referenceInterne: 'PUB-TEST-001',
        nom: 'Terrain public test',
        statutJuridique: 'Titre foncier',
        niveauVerification: 'Vérifié',
        region: 'Dakar',
        commune: 'Dakar',
        superficie: 500,
        prixPublic: 1000000,
        prixAcquisition: 500000,
        marge: 500000,
        commission: 100000,
        notesInternes: 'Confidentiel',
        statutCommercial: 'Disponible',
        proprietaireId: proprietaire.id,
      },
    });

    const response = await request(app.getHttpServer()).get(
      `/api/terrains/public/${terrain.id}`,
    );

    expect(response.status).toBe(200);
    const body = response.body;
    expect(body).not.toHaveProperty('prixAcquisition');
    expect(body).not.toHaveProperty('marge');
    expect(body).not.toHaveProperty('commission');
    expect(body).not.toHaveProperty('notesInternes');
    expect(body).not.toHaveProperty('proprietaire');
    expect(body).not.toHaveProperty('commercialResponsable');
    expect(body).not.toHaveProperty('storageKey');
    expect(Number(body.prixPublic)).toBe(1000000);
    expect(body.nom).toBe('Terrain public test');
  });

  it('rejette l accès à une route protégée sans token', async () => {
    const response = await request(app.getHttpServer()).get('/api/users');

    expect(response.status).toBe(401);
  });

  it('permet à un administrateur de se connecter et de créer un utilisateur', async () => {
    const role = await prisma.role.create({
      data: { name: 'administrateur', isSystem: true },
    });
    const permission = await prisma.permission.create({
      data: { name: 'users:consulter', resource: 'users', action: 'consulter' },
    });
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: permission.id },
    });

    const hashedPassword = await bcrypt.hash('AdminPassword123!', 12);
    const admin = await prisma.user.create({
      data: {
        email: 'admin-e2e@mtm-immobilier.sn',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'E2E',
        twoFactorEnabled: false,
        roles: { create: { roleId: role.id } },
      },
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin-e2e@mtm-immobilier.sn',
        password: 'AdminPassword123!',
      });

    expect(loginResponse.status).toBe(201);
    const accessToken = loginResponse.body.accessToken;

    const userResponse = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(userResponse.status).toBe(200);
    expect(userResponse.body.email).toBe('admin-e2e@mtm-immobilier.sn');
  });
});
