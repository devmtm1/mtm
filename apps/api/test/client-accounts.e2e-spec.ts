import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2eApp, type E2eContext } from './helpers/e2e-app';
import { describeE2e } from './helpers/e2e-database';

/**
 * Ouverture de l'espace « Ma location » / « Mon bien » pour une personne qui a
 * déjà un espace client (par exemple comme acheteur) : l'accès est ajouté à
 * son compte au lieu d'être refusé, sinon les onglets du site ne
 * s'afficheraient jamais pour elle.
 */
describeE2e('Espace client — rattachement à un compte existant (e2e)', () => {
  let app: INestApplication;
  let context: E2eContext;
  let tokenAgent: string;
  let locataireId: string;
  let locataireSansCompteId: string;

  const PASSWORD = 'MotDePasse-Solide-2026';
  const EMAIL_CLIENT = 'awa.client@exemple.sn';

  const login = async (email: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: PASSWORD });
    expect(response.status).toBe(201);
    return response.body.accessToken as string;
  };

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
    const { data, prisma } = context;

    const roleClient = await data.seedRoleWithPermissions('client', []);
    const roleAgent = await data.seedRoleWithPermissions('agent_locatif', [
      'clients:creer',
    ]);

    // Awa est déjà cliente : un espace client existe pour son adresse.
    const client = await data.seedUser({
      email: EMAIL_CLIENT,
      password: PASSWORD,
      firstName: 'Awa',
      lastName: 'Diop',
    });
    await data.linkUserRole(client.id, roleClient.id);

    const agent = await data.seedUser({
      email: 'agent@mtm.sn',
      password: PASSWORD,
    });
    await data.linkUserRole(agent.id, roleAgent.id);

    const locataire = await prisma.locataire.create({
      data: {
        firstName: 'Awa',
        lastName: 'Diop',
        email: EMAIL_CLIENT,
        phone: '+221770000001',
      },
    });
    locataireId = locataire.id;

    // Un agent du personnel dont l'adresse est aussi celle d'un locataire :
    // jamais rattaché.
    const locataireSansCompte = await prisma.locataire.create({
      data: {
        firstName: 'Agent',
        lastName: 'Interne',
        email: 'agent@mtm.sn',
        phone: '+221770000002',
      },
    });
    locataireSansCompteId = locataireSansCompte.id;

    tokenAgent = await login('agent@mtm.sn');
  });

  afterAll(async () => {
    await context.close();
  });

  it('avant l’ouverture, le compte client n’a pas d’espace locataire', async () => {
    const token = await login(EMAIL_CLIENT);
    const response = await request(app.getHttpServer())
      .get('/api/locatif/locataire/baux')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(403);
  });

  it('ajoute l’espace locataire au compte client existant, sans toucher à son mot de passe', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/locatif/locataires/${locataireId}/compte-client`)
      .set('Authorization', `Bearer ${tokenAgent}`)
      .send({ password: 'UnAutreMotDePasse-2026!' });

    expect(response.status).toBe(201);
    expect(response.body.compteExistant).toBe(true);
    expect(response.body.resetToken).toBeUndefined();

    // Le client se connecte avec son mot de passe d'origine, pas celui saisi par l'agent.
    const token = await login(EMAIL_CLIENT);
    const espace = await request(app.getHttpServer())
      .get('/api/locatif/locataire/baux')
      .set('Authorization', `Bearer ${token}`);
    expect(espace.status).toBe(200);
    expect(Array.isArray(espace.body)).toBe(true);

    const refus = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: EMAIL_CLIENT, password: 'UnAutreMotDePasse-2026!' });
    expect(refus.status).toBe(401);
  });

  it('refuse un second rattachement du même type pour la même adresse', async () => {
    const autre = await context.prisma.locataire.create({
      data: {
        firstName: 'Awa',
        lastName: 'Autre',
        email: EMAIL_CLIENT,
        phone: '+221770000003',
      },
    });
    const response = await request(app.getHttpServer())
      .post(`/api/locatif/locataires/${autre.id}/compte-client`)
      .set('Authorization', `Bearer ${tokenAgent}`)
      .send({ password: 'UnAutreMotDePasse-2026!' });
    expect(response.status).toBe(409);
  });

  it('ne rattache jamais un compte du personnel', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/locatif/locataires/${locataireSansCompteId}/compte-client`)
      .set('Authorization', `Bearer ${tokenAgent}`)
      .send({ password: 'UnAutreMotDePasse-2026!' });
    expect(response.status).toBe(409);
  });
});
