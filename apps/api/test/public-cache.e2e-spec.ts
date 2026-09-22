import request from 'supertest';
import { createE2eApp, type E2eContext } from './helpers/e2e-app';
import { describeE2e } from './helpers/e2e-database';

/**
 * Les lectures publiques du site vitrine doivent être mises en cache — c'est
 * ce qui évite de solliciter l'API à chaque navigation — et les routes
 * authentifiées jamais : une réponse destinée à un utilisateur ne doit
 * pouvoir être resservie à personne d'autre.
 */
describeE2e('Cache des lectures publiques (e2e)', () => {
  let context: E2eContext;

  beforeAll(async () => {
    context = await createE2eApp();
  });

  afterAll(async () => {
    await context.close();
  });

  const routesPubliques = [
    '/api/terrains/public',
    '/api/terrains/public/options',
    '/api/content',
    '/api/showcase',
  ];

  it.each(routesPubliques)('%s est mise en cache une minute', async (route) => {
    const response = await request(context.app.getHttpServer()).get(route);

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe(
      'public, max-age=60, stale-while-revalidate=300',
    );
  });

  it('une route authentifiée n’est jamais mise en cache', async () => {
    const response = await request(context.app.getHttpServer()).get(
      '/api/terrains',
    );

    expect(response.status).toBe(401);
    // Aucun en-tête de cache du tout : la réponse n'est conservée nulle part.
    expect(response.headers['cache-control']).toBeUndefined();
  });
});
