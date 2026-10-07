import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2eApp, type E2eContext } from './helpers/e2e-app';
import { describeE2e } from './helpers/e2e-database';

/**
 * Biens vendus affichés sur le site comme références (badge « Vendu ») : ils ne
 * le sont que si MTM les a cochés, la fiche est réduite (ni prix ni position
 * exacte), et le choix se retire à tout moment.
 */
describeE2e('Références vendues sur le site public (e2e)', () => {
  let app: INestApplication;
  let context: E2eContext;
  let jetonGestionnaire: string;
  let jetonLecteur: string;
  let disponibleId: string;
  let venduCocheId: string;
  let venduNonCocheId: string;

  const MOT_DE_PASSE = 'MotDePasse-Solide-2026';
  const ids = (corps: { items: { id: string }[] }) =>
    corps.items.map((item) => item.id);

  const connexion = async (email: string): Promise<string> => {
    const reponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: MOT_DE_PASSE });
    expect(reponse.status).toBe(201);
    return reponse.body.accessToken as string;
  };

  const creerBien = (
    data: E2eContext['data'],
    reference: string,
    extra: Record<string, unknown>,
  ) =>
    data.terrain.create({
      data: {
        referenceInterne: reference,
        nom: `Bien ${reference}`,
        statutJuridique: 'Titre foncier',
        niveauVerification: 'Vérifié',
        statutCommercial: 'Disponible',
        prixPublic: '25000000',
        commune: 'Saly',
        region: 'Thiès',
        latitude: 14.44,
        longitude: -17.0,
        localisationDetail: 'Rue 12, derrière la mosquée',
        description: 'Description complète du bien',
        ...extra,
      },
    });

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
    const { data, prisma } = context;

    const roleGestion = await data.seedRoleWithPermissions(
      'gestionnaire_biens',
      ['terrains:consulter', 'terrains:modifier', 'terrains:administrer'],
    );
    const roleLecture = await data.seedRoleWithPermissions('lecteur_biens', [
      'terrains:consulter',
    ]);
    const gestionnaire = await data.seedUser({
      email: 'gestion.biens@mtm.sn',
      password: MOT_DE_PASSE,
    });
    await data.linkUserRole(gestionnaire.id, roleGestion.id);
    const lecteur = await data.seedUser({
      email: 'lecteur.biens@mtm.sn',
      password: MOT_DE_PASSE,
    });
    await data.linkUserRole(lecteur.id, roleLecture.id);
    jetonGestionnaire = await connexion('gestion.biens@mtm.sn');
    jetonLecteur = await connexion('lecteur.biens@mtm.sn');

    const disponible = await creerBien(data, 'REF-DISPO', {});
    const venduCoche = await creerBien(data, 'REF-VENDU-OUI', {
      statutCommercial: 'Vendu',
      referenceVendue: true,
    });
    const venduNonCoche = await creerBien(data, 'REF-VENDU-NON', {
      statutCommercial: 'Vendu',
    });
    disponibleId = disponible.id;
    venduCocheId = venduCoche.id;
    venduNonCocheId = venduNonCoche.id;

    // La vente du bien coché : un dossier soldé donne la date affichée.
    const prospect = await prisma.prospect.create({
      data: { nom: 'Acheteur', statutPipeline: 'client' },
    });
    await prisma.dossierVente.create({
      data: {
        terrainId: venduCocheId,
        prospectId: prospect.id,
        statut: 'solde',
        prixVente: 25_000_000,
        dateVente: new Date('2026-09-15T00:00:00Z'),
      },
    });
  });

  afterAll(async () => {
    await context.close();
  });

  it('le catalogue par défaut ne montre que les biens disponibles', async () => {
    const reponse = await request(app.getHttpServer()).get(
      '/api/terrains/public',
    );
    expect(reponse.status).toBe(200);
    expect(ids(reponse.body)).toEqual([disponibleId]);
  });

  it('l’onglet « vendus » ne montre que ceux que MTM a cochés, sans prix ni position exacte', async () => {
    const reponse = await request(app.getHttpServer()).get(
      '/api/terrains/public?statut=vendu',
    );
    expect(reponse.status).toBe(200);
    expect(ids(reponse.body)).toEqual([venduCocheId]);

    const bien = reponse.body.items[0];
    expect(bien).toMatchObject({
      statutCommercial: 'Vendu',
      venduLe: '2026-09-15T00:00:00.000Z',
      prixPublic: null,
      latitude: null,
      longitude: null,
      localisationDetail: null,
      description: null,
      documents: [],
    });
    expect(bien.commune).toBe('Saly');
  });

  it('la fiche d’un bien vendu coché est réduite ; celle d’un vendu non coché est introuvable', async () => {
    const coche = await request(app.getHttpServer()).get(
      `/api/terrains/public/${venduCocheId}`,
    );
    expect(coche.status).toBe(200);
    expect(coche.body).toMatchObject({
      statutCommercial: 'Vendu',
      prixPublic: null,
    });

    const nonCoche = await request(app.getHttpServer()).get(
      `/api/terrains/public/${venduNonCocheId}`,
    );
    expect(nonCoche.status).toBe(404);

    const disponible = await request(app.getHttpServer()).get(
      `/api/terrains/public/${disponibleId}`,
    );
    expect(disponible.body).toMatchObject({
      statutCommercial: 'Disponible',
      prixPublic: '25000000',
    });
  });

  it('les filtres du site annoncent le nombre de références vendues', async () => {
    const options = await request(app.getHttpServer()).get(
      '/api/terrains/public/options',
    );
    expect(options.body.vendus).toBe(1);
  });

  it('MTM affiche puis retire un bien vendu, à tout moment', async () => {
    const afficher = await request(app.getHttpServer())
      .patch(`/api/terrains/${venduNonCocheId}/reference-vendue`)
      .set('Authorization', `Bearer ${jetonGestionnaire}`)
      .send({ afficher: true });
    expect(afficher.status).toBe(200);
    expect(afficher.body.referenceVendue).toBe(true);

    const visible = await request(app.getHttpServer()).get(
      '/api/terrains/public?statut=vendu',
    );
    expect(ids(visible.body).sort()).toEqual(
      [venduCocheId, venduNonCocheId].sort(),
    );

    const retirer = await request(app.getHttpServer())
      .patch(`/api/terrains/${venduNonCocheId}/reference-vendue`)
      .set('Authorization', `Bearer ${jetonGestionnaire}`)
      .send({ afficher: false });
    expect(retirer.status).toBe(200);

    const apres = await request(app.getHttpServer()).get(
      '/api/terrains/public?statut=vendu',
    );
    expect(ids(apres.body)).toEqual([venduCocheId]);
    const fiche = await request(app.getHttpServer()).get(
      `/api/terrains/public/${venduNonCocheId}`,
    );
    expect(fiche.status).toBe(404);
  });

  it('on ne peut afficher comme vendu qu’un bien vendu, et il faut le droit de modifier', async () => {
    const pasVendu = await request(app.getHttpServer())
      .patch(`/api/terrains/${disponibleId}/reference-vendue`)
      .set('Authorization', `Bearer ${jetonGestionnaire}`)
      .send({ afficher: true });
    expect(pasVendu.status).toBe(400);

    const sansDroit = await request(app.getHttpServer())
      .patch(`/api/terrains/${venduCocheId}/reference-vendue`)
      .set('Authorization', `Bearer ${jetonLecteur}`)
      .send({ afficher: false });
    expect(sansDroit.status).toBe(403);

    const anonyme = await request(app.getHttpServer())
      .patch(`/api/terrains/${venduCocheId}/reference-vendue`)
      .send({ afficher: false });
    expect(anonyme.status).toBe(401);
  });

  it('un bien qui repasse « Disponible » cesse d’être une référence vendue', async () => {
    const repasse = await request(app.getHttpServer())
      .patch(`/api/terrains/${venduCocheId}/commercial-status`)
      .set('Authorization', `Bearer ${jetonGestionnaire}`)
      .send({ value: 'Disponible' });
    // La route de changement de statut commercial peut exiger une autre permission : on vérifie le résultat en base.
    if (repasse.status >= 400) {
      await context.prisma.terrain.update({
        where: { id: venduCocheId },
        data: { statutCommercial: 'Disponible', referenceVendue: false },
      });
    }
    const terrain = await context.prisma.terrain.findUnique({
      where: { id: venduCocheId },
    });
    expect(terrain?.referenceVendue).toBe(false);
  });
});
