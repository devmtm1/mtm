process.env.LOGIN_RATE_LIMIT_MAX = '100';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2eApp, type E2eContext } from './helpers/e2e-app';
import { describeE2e } from './helpers/e2e-database';

/** Pastilles du menu : ce qui attend la personne, selon ses droits. */
describeE2e('Navigation : compteurs du menu (e2e)', () => {
  let app: INestApplication;
  let context: E2eContext;
  let tokenGestion = '';
  let tokenSansDroit = '';
  let idGestion = '';

  const PASSWORD = 'MotDePasse-Solide-2026';
  const JOUR = 24 * 3600 * 1000;

  const compteurs = (token: string) =>
    request(app.getHttpServer())
      .get('/api/navigation/compteurs')
      .set('Authorization', `Bearer ${token}`);

  const login = async (email: string) => {
    const r = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: PASSWORD });
    return r.body.accessToken as string;
  };

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
    const { data, prisma } = context;
    const roleGestion = await data.seedRoleWithPermissions('gestion_nav', [
      'contact:consulter',
      'locatif:consulter',
      'taches:consulter',
    ]);
    const roleSansDroit = await data.seedRoleWithPermissions('simple', []);
    const gestion = await data.seedUser({
      email: 'gestion@mtm.test',
      password: PASSWORD,
    });
    idGestion = gestion.id;
    await data.linkUserRole(gestion.id, roleGestion.id);
    const simple = await data.seedUser({
      email: 'simple@mtm.test',
      password: PASSWORD,
    });
    await data.linkUserRole(simple.id, roleSansDroit.id);

    // Deux messages du site, dont un déjà lu.
    await data.createContact({
      nom: 'A',
      email: 'a@x.test',
      message: 'Bonjour',
    });
    const lu = await data.createContact({
      nom: 'B',
      email: 'b@x.test',
      message: 'Déjà lu',
    });
    await prisma.contact.update({ where: { id: lu.id }, data: { lu: true } });

    // Mes tâches : une en retard, une à venir, une terminée en retard, et celle d'un autre.
    const autre = simple.id;
    const tache = (titre: string, extra: Record<string, unknown>) =>
      prisma.tache.create({
        data: {
          titre,
          responsableId: idGestion,
          creeParId: idGestion,
          statut: 'a_faire',
          ...extra,
        },
      });
    await tache('En retard', { dateLimite: new Date(Date.now() - 2 * JOUR) });
    await tache('À venir', { dateLimite: new Date(Date.now() + 2 * JOUR) });
    await tache('Terminée', {
      statut: 'terminee',
      dateLimite: new Date(Date.now() - 5 * JOUR),
    });
    await tache('À un autre', {
      responsableId: autre,
      dateLimite: new Date(Date.now() - 2 * JOUR),
    });

    tokenGestion = await login('gestion@mtm.test');
    tokenSansDroit = await login('simple@mtm.test');
  });

  afterAll(async () => {
    await context.close();
  });

  it('demande d’être connecté', async () => {
    const r = await request(app.getHttpServer()).get(
      '/api/navigation/compteurs',
    );
    expect(r.status).toBe(401);
  });

  it('compte les messages non lus et mes tâches en retard, selon les droits', async () => {
    const r = await compteurs(tokenGestion);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      demandesWeb: 1,
      tachesEnRetard: 1,
      // Droits de gestion locative sans rien à traiter, pas de droit de validation.
      relancesLocatives: 0,
      resiliations: 0,
      paiementsAValider: 0,
      saisiesFinancieres: 0,
    });
  });

  it('renvoie des zéros à qui n’a aucun droit, sans rien révéler', async () => {
    const r = await compteurs(tokenSansDroit);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({
      demandesWeb: 0,
      paiementsAValider: 0,
      relancesLocatives: 0,
      resiliations: 0,
      saisiesFinancieres: 0,
      tachesEnRetard: 0,
    });
  });
});
