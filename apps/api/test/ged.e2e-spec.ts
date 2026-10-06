import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2eApp, type E2eContext } from './helpers/e2e-app';
import { createCloudinaryMock } from './helpers/cloudinary-mock';
import { describeE2e } from './helpers/e2e-database';

/**
 * GED (section 17 CDC) : une recherche unique sur les documents de tous les
 * modules, qui ne montre à chacun que ce que son module d'origine lui montre.
 */
describeE2e('GED — recherche documentaire (e2e)', () => {
  let app: INestApplication;
  let context: E2eContext;
  let tokenA: string;
  let tokenB: string;
  let tokenDirection: string;
  let tokenSansDroit: string;

  const PASSWORD = 'MotDePasse-Solide-2026';

  const login = async (email: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: PASSWORD });
    expect(response.status).toBe(201);
    return response.body.accessToken as string;
  };

  beforeAll(async () => {
    context = await createE2eApp({
      cloudinary: createCloudinaryMock('mtm-e2e/ged'),
    });
    app = context.app;
    const { data, prisma } = context;

    const commercial = await data.seedRoleWithPermissions('commercial', [
      'terrains:consulter',
      'ventes:consulter',
    ]);
    // Rôle créé dans le back-office : le périmètre « tous les dossiers » vient de
    // la permission :administrer, pas du nom du rôle. (Le rôle « direction » est
    // sensible et exigerait la double authentification.)
    const direction = await data.seedRoleWithPermissions(
      'supervision_documents',
      [
        'terrains:administrer',
        'terrains:consulter',
        'ventes:consulter',
        'mandats:consulter',
      ],
    );
    const sansDroit = await data.seedRoleWithPermissions('stagiaire', [
      'contact:consulter',
    ]);

    const comptes = [
      ['a@mtm.sn', commercial.id],
      ['b@mtm.sn', commercial.id],
      ['direction@mtm.sn', direction.id],
      ['stagiaire@mtm.sn', sansDroit.id],
    ] as const;
    const ids: Record<string, string> = {};
    for (const [email, roleId] of comptes) {
      const user = await data.seedUser({ email, password: PASSWORD });
      await data.linkUserRole(user.id, roleId);
      ids[email] = user.id;
    }

    const terrain = (reference: string, nom: string, responsable: string) =>
      prisma.terrain.create({
        data: {
          referenceInterne: reference,
          nom,
          statutJuridique: 'Titre foncier',
          niveauVerification: 'Vérifié',
          statutCommercial: 'Disponible',
          commercialResponsableId: responsable,
        },
      });
    const terrainA = await terrain(
      'T-A',
      'Terrain des Almadies',
      ids['a@mtm.sn'],
    );
    const terrainB = await terrain('T-B', 'Terrain de Saly', ids['b@mtm.sn']);

    const doc = (
      terrainId: string,
      title: string,
      type: string,
      jours: number,
    ) =>
      prisma.terrainDocument.create({
        data: {
          terrainId,
          title,
          type,
          storageKey: `mtm-e2e/${title}`,
          createdAt: new Date(Date.now() - jours * 86_400_000),
        },
      });
    await doc(terrainA.id, 'Titre foncier Almadies', 'titre', 1);
    await doc(terrainA.id, 'Plan de bornage', 'plan', 2);
    await doc(terrainB.id, 'Titre foncier Saly', 'titre', 3);

    tokenA = await login('a@mtm.sn');
    tokenB = await login('b@mtm.sn');
    tokenDirection = await login('direction@mtm.sn');
    tokenSansDroit = await login('stagiaire@mtm.sn');
  });

  afterAll(async () => {
    await context.close();
  });

  const chercher = (
    token: string,
    query: Record<string, string | number> = {},
  ) =>
    request(app.getHttpServer())
      .get('/api/ged/documents')
      .query(query)
      .set('Authorization', `Bearer ${token}`);

  it('chaque commercial ne trouve que les documents de ses propres terrains', async () => {
    const a = await chercher(tokenA);
    expect(a.status).toBe(200);
    expect(a.body.items.map((d: { titre: string }) => d.titre).sort()).toEqual([
      'Plan de bornage',
      'Titre foncier Almadies',
    ]);

    const b = await chercher(tokenB);
    expect(b.body.items.map((d: { titre: string }) => d.titre)).toEqual([
      'Titre foncier Saly',
    ]);
  });

  it('le rôle de supervision voit les documents de tous', async () => {
    const response = await chercher(tokenDirection);
    expect(response.body.total).toBe(3);
  });

  it('sans permission « consulter », rien n’est visible', async () => {
    const response = await chercher(tokenSansDroit);
    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([]);
    expect(response.body.origines).toEqual([]);
  });

  it('trouve par titre, par type et par libellé de l’objet porteur', async () => {
    const parTitre = await chercher(tokenDirection, { q: 'bornage' });
    expect(parTitre.body.items).toHaveLength(1);

    const parType = await chercher(tokenDirection, { type: 'titre' });
    expect(parType.body.total).toBe(2);

    const parObjet = await chercher(tokenDirection, { q: 'Saly' });
    expect(parObjet.body.items.map((d: { titre: string }) => d.titre)).toEqual([
      'Titre foncier Saly',
    ]);
    expect(parObjet.body.items[0]).toMatchObject({
      origine: 'terrain',
      entiteLibelle: 'T-B · Terrain de Saly',
      lien: expect.stringMatching(/^\/terrains\//),
    });
  });

  it('une origine non autorisée est ignorée, sans erreur', async () => {
    const response = await chercher(tokenA, { origines: 'mandat,terrain' });
    expect(response.status).toBe(200);
    expect(
      response.body.items.every(
        (d: { origine: string }) => d.origine === 'terrain',
      ),
    ).toBe(true);
  });

  it('trie du plus récent au plus ancien et pagine', async () => {
    const page1 = await chercher(tokenDirection, { pageSize: 2, page: 1 });
    expect(page1.body.items.map((d: { titre: string }) => d.titre)).toEqual([
      'Titre foncier Almadies',
      'Plan de bornage',
    ]);
    const page2 = await chercher(tokenDirection, { pageSize: 2, page: 2 });
    expect(page2.body.items.map((d: { titre: string }) => d.titre)).toEqual([
      'Titre foncier Saly',
    ]);
  });

  it('filtre par période', async () => {
    const depuis = new Date(Date.now() - 1.5 * 86_400_000).toISOString();
    const response = await chercher(tokenDirection, { depuis });
    expect(response.body.items.map((d: { titre: string }) => d.titre)).toEqual([
      'Titre foncier Almadies',
    ]);
  });

  it('refuse une origine inconnue', async () => {
    const response = await chercher(tokenA, { origines: 'compta' });
    expect(response.status).toBe(400);
  });
});
