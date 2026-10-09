import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2eApp, type E2eContext } from './helpers/e2e-app';
import { createCloudinaryMock } from './helpers/cloudinary-mock';
import { describeE2e } from './helpers/e2e-database';

/**
 * Page « Notre équipe » : mot du directeur, photo de groupe, membres. Le
 * public ne voit que ce qui est publié, sans donnée de stockage ; le
 * back-office crée, édite, publie et retire.
 */
describeE2e('Équipe du site public (e2e)', () => {
  let app: INestApplication;
  let context: E2eContext;
  let tokenRedacteur: string;
  let tokenPublieur: string;
  let tokenSansDroit: string;

  const PASSWORD = 'MotDePasse-Solide-2026';

  const login = async (email: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: PASSWORD });
    expect(response.status).toBe(201);
    return response.body.accessToken as string;
  };

  const creer = (token: string, corps: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post('/api/team')
      .set('Authorization', `Bearer ${token}`)
      .send(corps);

  beforeAll(async () => {
    context = await createE2eApp({
      cloudinary: createCloudinaryMock('mtm-e2e/equipe', 'image'),
    });
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

  let directeurId: string;
  let groupeId: string;
  let membreId: string;

  it('la page publique est vide tant que rien n’est créé', async () => {
    const response = await request(app.getHttpServer()).get('/api/team');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      directeur: null,
      groupe: null,
      membres: [],
    });
  });

  it('un rédacteur crée des contenus, mais ne peut pas les publier', async () => {
    const directeur = await creer(tokenRedacteur, {
      kind: 'directeur',
      nom: 'Awa Diop',
      poste: 'Directrice générale',
      message: 'Bienvenue chez MTM.',
      isActive: true,
    });
    expect(directeur.status).toBe(201);
    // Demandé actif, mais sans droit de publication : reste en brouillon.
    expect(directeur.body.isActive).toBe(false);
    directeurId = directeur.body.id;

    const publique = await request(app.getHttpServer()).get('/api/team');
    expect(publique.body.directeur).toBeNull();
  });

  it('un publieur publie : le public voit le mot du directeur, sans donnée interne', async () => {
    const publie = await request(app.getHttpServer())
      .patch(`/api/team/${directeurId}/publish`)
      .set('Authorization', `Bearer ${tokenPublieur}`)
      .send({ isActive: true });
    expect(publie.status).toBe(200);

    const publique = await request(app.getHttpServer()).get('/api/team');
    expect(publique.body.directeur).toEqual({
      id: directeurId,
      nom: 'Awa Diop',
      poste: 'Directrice générale',
      message: 'Bienvenue chez MTM.',
      imageUrl: null,
    });
  });

  it('refuse un second mot du directeur ou une seconde photo de groupe', async () => {
    const second = await creer(tokenPublieur, {
      kind: 'directeur',
      nom: 'Autre Personne',
    });
    expect(second.status).toBe(409);

    const groupe = await creer(tokenPublieur, {
      kind: 'groupe',
      nom: 'L’équipe MTM',
      isActive: true,
    });
    expect(groupe.status).toBe(201);
    groupeId = groupe.body.id;
    const doublon = await creer(tokenPublieur, {
      kind: 'groupe',
      nom: 'Encore une',
    });
    expect(doublon.status).toBe(409);
  });

  it('classe les membres selon leur ordre et n’affiche que les publiés', async () => {
    for (const [nom, poste, ordre, isActive] of [
      ['Cheikh Ba', 'Conseiller commercial', 2, true],
      ['Fatou Sow', 'Gestion locative', 1, true],
      ['Caché', 'Brouillon', 3, false],
    ] as const) {
      const response = await creer(tokenPublieur, {
        kind: 'membre',
        nom,
        poste,
        ordre,
        isActive,
      });
      expect(response.status).toBe(201);
      if (nom === 'Fatou Sow') membreId = response.body.id;
    }

    const publique = await request(app.getHttpServer()).get('/api/team');
    expect(publique.body.membres.map((m: { nom: string }) => m.nom)).toEqual([
      'Fatou Sow',
      'Cheikh Ba',
    ]);
    expect(publique.body.groupe).toMatchObject({
      legende: 'L’équipe MTM',
      imageUrl: null,
    });
    // Rien du stockage ni des dates internes n'est exposé.
    const brut = JSON.stringify(publique.body);
    for (const interne of ['storageKey', 'resourceType', 'createdAt', 'kind']) {
      expect(brut).not.toContain(interne);
    }
  });

  it('envoie une photo, qui apparaît sur la page publique', async () => {
    const reponse = await request(app.getHttpServer())
      .post(`/api/team/${membreId}/image`)
      .set('Authorization', `Bearer ${tokenRedacteur}`)
      .attach(
        'file',
        // Signature PNG minimale : suffisante pour la validation de type.
        Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg==',
          'base64',
        ),
        { filename: 'photo.png', contentType: 'image/png' },
      );
    expect(reponse.status).toBe(201);

    const publique = await request(app.getHttpServer()).get('/api/team');
    const fatou = publique.body.membres.find(
      (m: { id: string }) => m.id === membreId,
    );
    expect(fatou.imageUrl).toBe('https://cloudinary.test/mtm-e2e/equipe');
  });

  it('modifie un membre, et vider le poste l’efface', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/team/${membreId}`)
      .set('Authorization', `Bearer ${tokenRedacteur}`)
      .send({ nom: '  Fatou Sow-Diallo ', poste: '' });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      nom: 'Fatou Sow-Diallo',
      poste: null,
    });
  });

  it('refuse un type inconnu, un nom trop court et un utilisateur sans droit', async () => {
    expect(
      (await creer(tokenPublieur, { kind: 'stagiaire', nom: 'Test Test' }))
        .status,
    ).toBe(400);
    expect(
      (await creer(tokenPublieur, { kind: 'membre', nom: 'A' })).status,
    ).toBe(400);
    expect(
      (await creer(tokenSansDroit, { kind: 'membre', nom: 'Test Test' }))
        .status,
    ).toBe(403);
    const admin = await request(app.getHttpServer())
      .get('/api/team/admin')
      .set('Authorization', `Bearer ${tokenSansDroit}`);
    expect(admin.status).toBe(403);
    // Publier est un droit distinct de modifier.
    const publier = await request(app.getHttpServer())
      .patch(`/api/team/${membreId}/publish`)
      .set('Authorization', `Bearer ${tokenRedacteur}`)
      .send({ isActive: false });
    expect(publier.status).toBe(403);
  });

  it('l’administration voit aussi les brouillons', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/team/admin')
      .set('Authorization', `Bearer ${tokenRedacteur}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(5);
    expect(response.body.some((m: { nom: string }) => m.nom === 'Caché')).toBe(
      true,
    );
  });

  it('supprime un membre et sa photo, et le retire du site', async () => {
    const refus = await request(app.getHttpServer())
      .delete(`/api/team/${membreId}`)
      .set('Authorization', `Bearer ${tokenRedacteur}`);
    expect(refus.status).toBe(403);

    const response = await request(app.getHttpServer())
      .delete(`/api/team/${membreId}`)
      .set('Authorization', `Bearer ${tokenPublieur}`);
    expect(response.status).toBe(200);

    const publique = await request(app.getHttpServer()).get('/api/team');
    expect(publique.body.membres.map((m: { nom: string }) => m.nom)).toEqual([
      'Cheikh Ba',
    ]);
    expect(groupeId).toBeTruthy();
  });
});
