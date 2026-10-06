import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2eApp, type E2eContext } from './helpers/e2e-app';
import { createCloudinaryMock } from './helpers/cloudinary-mock';
import { describeE2e } from './helpers/e2e-database';

/**
 * Locations sur le site public : un bien se prépare au back-office (photos,
 * loyer), se publie, apparaît sur le site avec des filtres, disparaît dès qu'il
 * est loué, et peut être demandé par un visiteur.
 */
describeE2e('Locations sur le site public (e2e)', () => {
  let app: INestApplication;
  let context: E2eContext;
  let tokenGestionnaire: string;
  let tokenSansPublier: string;
  let bienId: string;
  let secondBienId: string;
  let proprietaireId: string;

  const PASSWORD = 'MotDePasse-Solide-2026';
  // Signature JPEG minimale : le contrôle d'envoi lit les premiers octets.
  const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);

  const login = async (email: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: PASSWORD });
    expect(response.status).toBe(201);
    return response.body.accessToken as string;
  };

  const ajouterPhoto = (id: string, token: string) =>
    request(app.getHttpServer())
      .post(`/api/locatif/biens/${id}/medias`)
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Salon')
      .attach('file', JPEG, {
        filename: 'salon.jpg',
        contentType: 'image/jpeg',
      });

  beforeAll(async () => {
    context = await createE2eApp({
      cloudinary: createCloudinaryMock('mtm-e2e/locations'),
    });
    app = context.app;
    const { data, prisma } = context;

    const gestionnaire = await data.seedRoleWithPermissions(
      'gestion_locative_test',
      [
        'locatif:consulter',
        'locatif:creer',
        'locatif:modifier',
        'locatif:publier',
        'locatif:administrer',
      ],
    );
    const sansPublier = await data.seedRoleWithPermissions(
      'agent_locatif_test',
      ['locatif:consulter', 'locatif:modifier'],
    );
    for (const [email, role] of [
      ['gestion@mtm.sn', gestionnaire],
      ['agent@mtm.sn', sansPublier],
    ] as const) {
      const user = await data.seedUser({ email, password: PASSWORD });
      await data.linkUserRole(user.id, role.id);
    }

    const proprietaire = await prisma.proprietaire.create({
      data: {
        firstName: 'Moussa',
        lastName: 'Ndiaye',
        email: 'proprio@exemple.sn',
        phone: '+221770000000',
      },
    });
    proprietaireId = proprietaire.id;

    tokenGestionnaire = await login('gestion@mtm.sn');
    tokenSansPublier = await login('agent@mtm.sn');
  });

  afterAll(async () => {
    await context.close();
  });

  const publicGet = (path: string) =>
    request(app.getHttpServer()).get(`/api/locatif/public${path}`);

  describe('préparation et publication au back-office', () => {
    it('crée un bien avec ses champs d’annonce, non publié', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/locatif/biens')
        .set('Authorization', `Bearer ${tokenGestionnaire}`)
        .send({
          proprietaireId,
          type: 'appartement',
          adresse: '12 rue Secrète, Almadies',
          commune: 'Ngor',
          region: 'Dakar',
          superficie: 85,
          notes: 'Note interne : le propriétaire négocie',
          titre: 'Appartement lumineux aux Almadies',
          description: 'Au calme, proche des commerces.',
          loyerMensuel: 350000,
          charges: 25000,
          moisCaution: 2,
          nombrePieces: 4,
          nombreChambres: 3,
          nombreSallesEau: 2,
          meuble: true,
          equipements: ['Climatisation', 'Parking', 'Climatisation'],
          latitude: 14.7456789,
          longitude: -17.5123456,
        });
      expect(response.status).toBe(201);
      expect(response.body.publie).toBe(false);
      expect(response.body.equipements).toEqual(['Climatisation', 'Parking']);
      bienId = response.body.id;
    });

    it('un bien non publié n’apparaît pas sur le site', async () => {
      const liste = await publicGet('/biens');
      expect(liste.status).toBe(200);
      expect(liste.body.total).toBe(0);
      expect((await publicGet(`/biens/${bienId}`)).status).toBe(404);
    });

    it('refuse de publier sans photo', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/locatif/biens/${bienId}`)
        .set('Authorization', `Bearer ${tokenGestionnaire}`)
        .send({ publie: true });
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/photo/);
    });

    it('accepte une photo et la renvoie avec son lien', async () => {
      const response = await ajouterPhoto(bienId, tokenGestionnaire);
      expect(response.status).toBe(201);
      expect(response.body.type).toBe('photo');

      const fiche = await request(app.getHttpServer())
        .get(`/api/locatif/biens/${bienId}`)
        .set('Authorization', `Bearer ${tokenGestionnaire}`);
      expect(fiche.body.medias).toHaveLength(1);
      expect(fiche.body.medias[0].secureUrl).toContain('http');
    });

    it('refuse un fichier qui n’est pas une image', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/locatif/biens/${bienId}/medias`)
        .set('Authorization', `Bearer ${tokenGestionnaire}`)
        .attach('file', Buffer.from('pas une image'), {
          filename: 'faux.jpg',
          contentType: 'image/jpeg',
        });
      expect(response.status).toBe(400);
    });

    it('réserve la publication à la permission locatif:publier', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/locatif/biens/${bienId}`)
        .set('Authorization', `Bearer ${tokenSansPublier}`)
        .send({ publie: true });
      expect(response.status).toBe(403);
    });

    it('exige un loyer pour publier', async () => {
      const sansLoyer = await request(app.getHttpServer())
        .post('/api/locatif/biens')
        .set('Authorization', `Bearer ${tokenGestionnaire}`)
        .send({
          proprietaireId,
          type: 'studio',
          adresse: '3 avenue Test',
          commune: 'Mbour',
          region: 'Thiès',
        });
      secondBienId = sansLoyer.body.id;
      await ajouterPhoto(secondBienId, tokenGestionnaire);
      const response = await request(app.getHttpServer())
        .patch(`/api/locatif/biens/${secondBienId}`)
        .set('Authorization', `Bearer ${tokenGestionnaire}`)
        .send({ publie: true });
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/loyer/);
    });

    it('publie le bien : loyer et photo présents', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/locatif/biens/${bienId}`)
        .set('Authorization', `Bearer ${tokenGestionnaire}`)
        .send({ publie: true });
      expect(response.status).toBe(200);
      expect(response.body.publie).toBe(true);
      expect(response.body.publieLe).toEqual(expect.any(String));
    });

    it('ne permet pas de supprimer la dernière photo d’une annonce publiée', async () => {
      const fiche = await request(app.getHttpServer())
        .get(`/api/locatif/biens/${bienId}`)
        .set('Authorization', `Bearer ${tokenGestionnaire}`);
      const response = await request(app.getHttpServer())
        .delete(
          `/api/locatif/biens/${bienId}/medias/${fiche.body.medias[0].id}`,
        )
        .set('Authorization', `Bearer ${tokenGestionnaire}`);
      expect(response.status).toBe(400);
    });
  });

  describe('catalogue public', () => {
    it('liste l’annonce sans aucune donnée interne', async () => {
      const liste = await publicGet('/biens');
      expect(liste.body.total).toBe(1);
      const annonce = liste.body.items[0];
      expect(annonce).toMatchObject({
        titre: 'Appartement lumineux aux Almadies',
        loyerMensuel: 350000,
        charges: 25000,
        montantCaution: 700000,
        commune: 'Ngor',
        nombreChambres: 3,
        meuble: true,
      });
      expect(annonce.medias).toHaveLength(1);

      // Liste blanche : ni propriétaire, ni adresse exacte, ni note interne.
      const texte = JSON.stringify(liste.body);
      expect(texte).not.toContain('Secrète');
      expect(texte).not.toContain('Ndiaye');
      expect(texte).not.toContain('proprio@exemple.sn');
      expect(texte).not.toContain('négocie');
      expect(annonce).not.toHaveProperty('adresse');
      expect(annonce).not.toHaveProperty('notes');
      expect(annonce).not.toHaveProperty('proprietaire');
      // Position arrondie : on situe le quartier, pas la porte.
      expect(annonce.latitude).toBe(14.746);
      expect(annonce.longitude).toBe(-17.512);
    });

    it('filtre par loyer, chambres, type et meublé', async () => {
      expect((await publicGet('/biens?loyerMax=300000')).body.total).toBe(0);
      expect(
        (await publicGet('/biens?loyerMin=300000&loyerMax=400000')).body.total,
      ).toBe(1);
      expect((await publicGet('/biens?chambresMin=4')).body.total).toBe(0);
      expect((await publicGet('/biens?chambresMin=3')).body.total).toBe(1);
      expect((await publicGet('/biens?type=studio')).body.total).toBe(0);
      expect((await publicGet('/biens?meuble=false')).body.total).toBe(0);
      expect((await publicGet('/biens?meuble=true')).body.total).toBe(1);
      expect((await publicGet('/biens?commune=Ngor')).body.total).toBe(1);
      expect((await publicGet('/biens?search=lumineux')).body.total).toBe(1);
    });

    it('la recherche libre ne trouve jamais l’adresse exacte', async () => {
      expect((await publicGet('/biens?search=Secrète')).body.total).toBe(0);
    });

    it('propose des filtres dérivés des annonces visibles', async () => {
      const options = await publicGet('/biens/options');
      expect(options.body).toMatchObject({
        type: ['appartement'],
        commune: ['Ngor'],
        region: ['Dakar'],
        chambres: [3],
        loyerMin: 350000,
        loyerMax: 350000,
        total: 1,
      });
    });

    it('ouvre la fiche détaillée', async () => {
      const fiche = await publicGet(`/biens/${bienId}`);
      expect(fiche.status).toBe(200);
      expect(fiche.body.equipements).toEqual(['Climatisation', 'Parking']);
      expect(fiche.body.description).toContain('proche des commerces');
    });

    it('rejette un tri qui ne fait pas partie des critères publics', async () => {
      expect((await publicGet('/biens?sortBy=notes')).status).toBe(400);
    });
  });

  describe('demande depuis l’annonce', () => {
    it('enregistre la demande, rattachée au bien, et prévient les gestionnaires', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/contact')
        .send({
          nom: 'Awa Fall',
          email: 'awa@exemple.sn',
          telephone: '+221771112233',
          message: 'Je souhaite visiter cet appartement la semaine prochaine.',
          bienLocatifId: bienId,
        });
      expect(response.status).toBe(201);
      expect(response.body).toEqual({ success: true });
      const enregistree = await context.prisma.contact.findFirst({
        where: { email: 'awa@exemple.sn', bienLocatifId: bienId },
      });
      expect(enregistree?.sujet).toBe('Demande de location');

      // La cloche des gestionnaires est alimentée (traitement en arrière-plan).
      await new Promise((resolve) => setTimeout(resolve, 500));
      const notifications = await request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${tokenGestionnaire}`);
      expect(
        notifications.body.items.map((item: { type: string }) => item.type),
      ).toContain('demande_location');
    });

    it('refuse une demande pour une annonce qui n’est pas visible', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/contact')
        .send({
          nom: 'Awa Fall',
          email: 'awa@exemple.sn',
          message: 'Je souhaite visiter ce studio non publié.',
          bienLocatifId: secondBienId,
        });
      expect(response.status).toBe(404);
    });
  });

  describe('bien loué ou retiré', () => {
    it('disparaît du site dès qu’il est loué', async () => {
      await context.prisma.bienLocatif.update({
        where: { id: bienId },
        data: { statut: 'loue' },
      });
      expect((await publicGet('/biens')).body.total).toBe(0);
      expect((await publicGet(`/biens/${bienId}`)).status).toBe(404);

      const demande = await request(app.getHttpServer())
        .post('/api/contact')
        .send({
          nom: 'Awa Fall',
          email: 'awa@exemple.sn',
          message: 'Cet appartement est-il toujours libre ?',
          bienLocatifId: bienId,
        });
      expect(demande.status).toBe(404);
    });

    it('réapparaît quand il est de nouveau libre, et se retire à la demande', async () => {
      await context.prisma.bienLocatif.update({
        where: { id: bienId },
        data: { statut: 'disponible' },
      });
      expect((await publicGet('/biens')).body.total).toBe(1);

      const retrait = await request(app.getHttpServer())
        .patch(`/api/locatif/biens/${bienId}`)
        .set('Authorization', `Bearer ${tokenGestionnaire}`)
        .send({ publie: false });
      expect(retrait.status).toBe(200);
      expect((await publicGet('/biens')).body.total).toBe(0);
    });
  });
});
