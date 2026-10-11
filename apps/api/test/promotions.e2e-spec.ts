import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2eApp, type E2eContext } from './helpers/e2e-app';
import { createCloudinaryMock } from './helpers/cloudinary-mock';
import { describeE2e } from './helpers/e2e-database';

/**
 * Publicités et promotions du bandeau d'accueil : le public ne voit que celles
 * qui sont publiées, avec un média, et dans leur période de diffusion.
 */
describeE2e('Promotions du bandeau (e2e)', () => {
  let app: INestApplication;
  let context: E2eContext;
  let tokenRedacteur: string;
  let tokenPublieur: string;
  let tokenSansDroit: string;
  const cloudinary = createCloudinaryMock('mtm-e2e/promotions', 'image');

  const PASSWORD = 'MotDePasse-Solide-2026';
  const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg==',
    'base64',
  );
  /** Un jour décalé de `jours` par rapport à aujourd'hui, au format AAAA-MM-JJ. */
  const jour = (jours: number): string =>
    new Date(Date.now() + jours * 86_400_000).toISOString().slice(0, 10);

  const login = async (email: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: PASSWORD });
    expect(response.status).toBe(201);
    return response.body.accessToken as string;
  };

  const creer = (token: string, corps: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post('/api/promotions')
      .set('Authorization', `Bearer ${token}`)
      .send(corps);

  const publier = (token: string, id: string, isActive: boolean) =>
    request(app.getHttpServer())
      .patch(`/api/promotions/${id}/publish`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isActive });

  const envoyerImage = (token: string, id: string) =>
    request(app.getHttpServer())
      .post(`/api/promotions/${id}/media`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', PNG, {
        filename: 'affiche.png',
        contentType: 'image/png',
      });

  const publiques = async () =>
    (await request(app.getHttpServer()).get('/api/promotions')).body as Array<
      Record<string, unknown>
    >;

  beforeAll(async () => {
    context = await createE2eApp({ cloudinary });
    app = context.app;
    const { data } = context;

    const redacteur = await data.seedRoleWithPermissions('redacteur_site', [
      'content:consulter',
      'content:creer',
      'content:modifier',
    ]);
    const publieur = await data.seedRoleWithPermissions('responsable_site', [
      'content:consulter',
      'content:creer',
      'content:modifier',
      'content:publier',
      'content:supprimer',
    ]);
    const sansDroit = await data.seedRoleWithPermissions('stagiaire', [
      'contact:consulter',
    ]);
    for (const [email, role] of [
      ['redacteur@mtm.sn', redacteur],
      ['publieur@mtm.sn', publieur],
      ['stagiaire@mtm.sn', sansDroit],
    ] as const) {
      const user = await data.seedUser({ email, password: PASSWORD });
      await data.linkUserRole(user.id, role.id);
    }
    tokenRedacteur = await login('redacteur@mtm.sn');
    tokenPublieur = await login('publieur@mtm.sn');
    tokenSansDroit = await login('stagiaire@mtm.sn');
  });

  afterAll(async () => {
    await context.close();
  });

  let promoId: string;

  it('le bandeau public est vide tant que rien n’est publié', async () => {
    expect(await publiques()).toEqual([]);
  });

  it('une promotion neuve est un brouillon sans média, même si on demande de la publier', async () => {
    const response = await creer(tokenRedacteur, {
      titre: 'Promotion de rentrée',
      description: 'Frais de dossier offerts',
      lienUrl: '/terrains',
      libelleLien: 'Voir les terrains',
      isActive: true,
    });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      titre: 'Promotion de rentrée',
      isActive: false,
      statut: 'sans_media',
      mediaUrl: null,
    });
    promoId = response.body.id;
  });

  it('refuse un lien dangereux ou non sécurisé', async () => {
    for (const lienUrl of [
      'javascript:alert(1)',
      'http://exemple.sn',
      '//exemple.sn',
      'data:text/html,x',
    ]) {
      const response = await creer(tokenRedacteur, { titre: 'Piège', lienUrl });
      expect(response.status).toBe(400);
    }
    const valide = await creer(tokenRedacteur, {
      titre: 'Lien externe',
      lienUrl: 'https://exemple.sn/offre',
    });
    expect(valide.status).toBe(201);
    await request(app.getHttpServer())
      .delete(`/api/promotions/${valide.body.id}`)
      .set('Authorization', `Bearer ${tokenPublieur}`);
  });

  it('refuse de publier une promotion sans média', async () => {
    const response = await publier(tokenPublieur, promoId, true);
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/média|image/i);
  });

  it('envoie l’affiche ; le rédacteur ne peut toujours pas publier', async () => {
    const envoi = await envoyerImage(tokenRedacteur, promoId);
    expect(envoi.status).toBe(201);
    expect(envoi.body).toMatchObject({
      statut: 'brouillon',
      mediaUrl: 'https://cloudinary.test/mtm-e2e/promotions',
    });
    expect((await publier(tokenRedacteur, promoId, true)).status).toBe(403);
    expect(await publiques()).toEqual([]);
  });

  it('une fois publiée, elle apparaît sur le site, sans donnée interne', async () => {
    const response = await publier(tokenPublieur, promoId, true);
    expect(response.status).toBe(200);
    expect(response.body.statut).toBe('en_ligne');

    const liste = await publiques();
    expect(liste).toHaveLength(1);
    expect(liste[0]).toMatchObject({
      id: promoId,
      titre: 'Promotion de rentrée',
      type: 'image',
      mediaUrl: 'https://cloudinary.test/mtm-e2e/promotions',
      lienUrl: '/terrains',
      libelleLien: 'Voir les terrains',
    });
    const brut = JSON.stringify(liste);
    for (const interne of ['storageKey', 'isActive', 'resourceType']) {
      expect(brut).not.toContain(interne);
    }
  });

  it('une diffusion programmée dans le futur n’est pas encore visible', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/promotions/${promoId}`)
      .set('Authorization', `Bearer ${tokenRedacteur}`)
      .send({ dateDebut: jour(3), dateFin: jour(10) });
    expect(response.status).toBe(200);
    expect(response.body.statut).toBe('programmee');
    expect(await publiques()).toEqual([]);
  });

  it('une promotion en cours de période est visible, une expirée ne l’est plus', async () => {
    const enCours = await request(app.getHttpServer())
      .patch(`/api/promotions/${promoId}`)
      .set('Authorization', `Bearer ${tokenRedacteur}`)
      .send({ dateDebut: jour(-2), dateFin: jour(0) });
    // Le dernier jour compte : elle reste en ligne toute la journée.
    expect(enCours.body.statut).toBe('en_ligne');
    expect(await publiques()).toHaveLength(1);

    const expiree = await request(app.getHttpServer())
      .patch(`/api/promotions/${promoId}`)
      .set('Authorization', `Bearer ${tokenRedacteur}`)
      .send({ dateDebut: jour(-10), dateFin: jour(-1) });
    expect(expiree.body.statut).toBe('expiree');
    expect(await publiques()).toEqual([]);
  });

  it('refuse une fin de diffusion avant son début', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/promotions/${promoId}`)
      .set('Authorization', `Bearer ${tokenRedacteur}`)
      .send({ dateDebut: jour(5), dateFin: jour(1) });
    expect(response.status).toBe(400);
  });

  it('vider les dates supprime la limite de diffusion', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/promotions/${promoId}`)
      .set('Authorization', `Bearer ${tokenRedacteur}`)
      .send({ dateDebut: null, dateFin: null });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      dateDebut: null,
      dateFin: null,
      statut: 'en_ligne',
    });
  });

  it('une vidéo est servie avec son image d’aperçu, dans l’ordre choisi', async () => {
    const video = await creer(tokenPublieur, {
      titre: 'Film de présentation',
      ordre: 0,
    });
    cloudinary.upload.mockResolvedValueOnce({
      publicId: 'mtm-e2e/promotions/film',
      resourceType: 'video',
      secureUrl: 'https://cloudinary.test/mtm-e2e/promotions/film',
    });
    // Signature « ftyp » d'un conteneur MP4.
    const mp4 = Buffer.concat([
      Buffer.from([0, 0, 0, 24]),
      Buffer.from('ftypisom'),
      Buffer.alloc(16),
    ]);
    const envoi = await request(app.getHttpServer())
      .post(`/api/promotions/${video.body.id}/media`)
      .set('Authorization', `Bearer ${tokenPublieur}`)
      .attach('file', mp4, { filename: 'film.mp4', contentType: 'video/mp4' });
    expect(envoi.status).toBe(201);
    expect((await publier(tokenPublieur, video.body.id, true)).status).toBe(
      200,
    );
    // L'affiche, elle, passe en dernier.
    await request(app.getHttpServer())
      .patch(`/api/promotions/${promoId}`)
      .set('Authorization', `Bearer ${tokenPublieur}`)
      .send({ ordre: 5 });

    const liste = await publiques();
    expect(liste.map((promo) => promo.titre)).toEqual([
      'Film de présentation',
      'Promotion de rentrée',
    ]);
    expect(liste[0]).toMatchObject({
      type: 'video',
      posterUrl: 'https://cloudinary.test/mtm-e2e/promotions/film.jpg',
    });
    expect(liste[1].posterUrl).toBeNull();

    await request(app.getHttpServer())
      .delete(`/api/promotions/${video.body.id}`)
      .set('Authorization', `Bearer ${tokenPublieur}`);
  });

  it('retirer une promotion la fait disparaître du site', async () => {
    expect((await publier(tokenPublieur, promoId, false)).status).toBe(200);
    expect(await publiques()).toEqual([]);
  });

  it('l’administration est réservée aux utilisateurs habilités', async () => {
    const sans = await request(app.getHttpServer())
      .get('/api/promotions/admin')
      .set('Authorization', `Bearer ${tokenSansDroit}`);
    expect(sans.status).toBe(403);
    const anonyme = await request(app.getHttpServer()).get(
      '/api/promotions/admin',
    );
    expect(anonyme.status).toBe(401);

    const liste = await request(app.getHttpServer())
      .get('/api/promotions/admin')
      .set('Authorization', `Bearer ${tokenRedacteur}`);
    expect(liste.status).toBe(200);
    expect(liste.body.some((p: { id: string }) => p.id === promoId)).toBe(true);
  });

  it('seul un utilisateur habilité supprime, et le média est effacé', async () => {
    const refus = await request(app.getHttpServer())
      .delete(`/api/promotions/${promoId}`)
      .set('Authorization', `Bearer ${tokenRedacteur}`);
    expect(refus.status).toBe(403);

    const reponse = await request(app.getHttpServer())
      .delete(`/api/promotions/${promoId}`)
      .set('Authorization', `Bearer ${tokenPublieur}`);
    expect(reponse.status).toBe(200);
    expect(cloudinary.destroy).toHaveBeenCalled();
  });
});
