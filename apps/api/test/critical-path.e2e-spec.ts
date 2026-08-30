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
 * Test e2e du parcours critique de la Phase 0, correspondant exactement
 * au critère de validation du backlog J0.1 :
 *
 *   "Un administrateur MTM peut se connecter, créer un utilisateur,
 *    lui attribuer un rôle, et voir l'action tracée dans le journal
 *    d'audit."
 *
 * PrismaService est remplacé par un double in-memory (FakePrismaService)
 * car le client Prisma généré n'est pas disponible dans ce sandbox
 * (voir apps/api/prisma/PRISMA_NOTES.md). Ce test vérifie donc le
 * câblage HTTP réel — routing, guards, ValidationPipe, contrôleurs,
 * services — mais PAS la traduction SQL réelle de Prisma. Ce dernier
 * point doit être revérifié une fois `prisma generate` exécuté avec un
 * accès réseau complet (voir PRISMA_NOTES.md pour la procédure).
 */
describe('Parcours critique Phase 0 (e2e)', () => {
  let app: INestApplication;
  let fakePrisma: FakePrismaService;

  const ADMIN_PASSWORD = 'AdminPassword123!';
  const ADMIN_2FA_SECRET = 'JBSWY3DPEHPK3PXP';
  let adminEmail: string;
  let accessToken: string;

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
      'users:consulter',
      'users:creer',
      'users:modifier',
      'users:administrer',
      'roles:consulter',
      'audit:consulter',
    ];
    for (const name of permissionNames) {
      const permission = fakePrisma.seedPermission(name);
      fakePrisma.linkRolePermission(adminRole.id, permission.id);
    }

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

  it('GET /api/health est accessible sans authentification', async () => {
    const response = await request(app.getHttpServer()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('rejette l’accès à une route protégée sans token', async () => {
    const response = await request(app.getHttpServer()).get('/api/users');

    expect(response.status).toBe(401);
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
    expect(response.body.user.email).toBe(adminEmail);
    expect(response.body.user.permissions).toContain('users:creer');

    accessToken = response.body.accessToken;
  });

  it('GET /api/auth/me retourne le profil complet de l’utilisateur connecté', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.email).toBe(adminEmail);
    expect(response.body.permissions).toContain('users:creer');
  });

  it('rejette une connexion avec un mauvais mot de passe', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password: 'mauvais-mot-de-passe' });

    expect(response.status).toBe(401);
  });

  let createdUserId: string;

  it('étape 2 — création d’un nouvel utilisateur', async () => {
    const commercialRole = fakePrisma.seedRole('commercial_test');
    commercialRoleId = commercialRole.id;

    const response = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        email: 'commercial@mtm-immobilier.sn',
        password: 'MotDePasseSecurise123!',
        firstName: 'Fatou',
        lastName: 'Diop',
        roleId: commercialRoleId,
      });

    expect(response.status).toBe(201);
    expect(response.body.email).toBe('commercial@mtm-immobilier.sn');
    expect(response.body.password).toBeUndefined();

    createdUserId = response.body.id;
  });

  it('rejette la création si le corps contient un champ inconnu', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        email: 'autre@mtm-immobilier.sn',
        password: 'MotDePasseSecurise123!',
        firstName: 'X',
        lastName: 'Y',
        isSuperAdmin: true,
      });

    expect(response.status).toBe(400);
  });

  let commercialRoleId: string;

  it('étape 3 — attribution d’un rôle au nouvel utilisateur', async () => {
    const roleResponse = await request(app.getHttpServer())
      .post('/api/roles')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'commercial_test', description: 'Rôle de test e2e' });

    if (roleResponse.status === 201) {
      commercialRoleId = roleResponse.body.id;
    }

    const assignResponse = await request(app.getHttpServer())
      .post(`/api/users/${createdUserId}/roles`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ roleId: commercialRoleId });

    expect(assignResponse.status).toBe(201);
    expect(assignResponse.body.success).toBe(true);
  });

  it('étape 4 — le journal d’audit contient les actions tracées', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/audit')
      .query({ entityType: 'User' })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    const actions = response.body.items.map(
      (i: { action: string }) => i.action,
    );

    expect(actions).toContain('auth.login.success');
    expect(actions).toContain('user.created');
    expect(actions).toContain('user.role_assigned');
  });

  describe('Changement de mot de passe forcé (mustChangePassword)', () => {
    const TEMP_PASSWORD = 'MotDePasseTemporaire123!';
    const NEW_PASSWORD = 'NouveauMotDePasse456!';
    let tempUserToken: string;

    beforeAll(async () => {
      const hashedTempPassword = await bcrypt.hash(TEMP_PASSWORD, 4);
      fakePrisma.seedUser({
        email: 'temp-user@mtm-immobilier.sn',
        password: hashedTempPassword,
        firstName: 'Temp',
        lastName: 'User',
        mustChangePassword: true,
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'temp-user@mtm-immobilier.sn',
          password: TEMP_PASSWORD,
        });

      expect(loginResponse.body.user.mustChangePassword).toBe(true);
      tempUserToken = loginResponse.body.accessToken;
    });

    it('bloque l’accès aux routes protégées tant que le mot de passe n’a pas été changé', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${tempUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('PASSWORD_CHANGE_REQUIRED');
    });

    it('autorise /auth/me malgré le blocage (route exemptée)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tempUserToken}`);

      expect(response.status).toBe(200);
    });

    it('rejette le changement avec un mauvais mot de passe actuel', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${tempUserToken}`)
        .send({ currentPassword: 'mauvais', newPassword: NEW_PASSWORD });

      expect(response.status).toBe(401);
    });

    it('accepte le changement avec le bon mot de passe actuel, débloquant l’accès', async () => {
      const changeResponse = await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${tempUserToken}`)
        .send({ currentPassword: TEMP_PASSWORD, newPassword: NEW_PASSWORD });

      expect(changeResponse.status).toBe(201);
      expect(changeResponse.body.success).toBe(true);

      const meResponse = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tempUserToken}`);
      expect(meResponse.body.mustChangePassword).toBe(false);

      // La route précédemment bloquée redevient accessible avec le
      // même token (le flag est relu depuis la base à chaque requête).
      const usersResponse = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${tempUserToken}`);
      expect(usersResponse.status).toBe(403); // toujours 403 mais pour raison de permission, pas mustChangePassword
      expect(usersResponse.body.code).not.toBe('PASSWORD_CHANGE_REQUIRED');
    });
  });

  describe('Désactivation du 2FA — confirmation par mot de passe requise', () => {
    it('rejette la désactivation avec un mauvais mot de passe', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/2fa/disable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'mauvais-mot-de-passe' });

      expect(response.status).toBe(401);
    });
  });
});
