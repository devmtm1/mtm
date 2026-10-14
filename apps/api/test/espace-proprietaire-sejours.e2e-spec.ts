process.env.LOGIN_RATE_LIMIT_MAX = '100';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2eApp, type E2eContext } from './helpers/e2e-app';
import { describeE2e } from './helpers/e2e-database';

/**
 * L'espace propriétaire doit tenir compte des locations à la nuit : un bien
 * loué en courte durée n'a pas de bail, et son statut reste « disponible » —
 * mais il est occupé, réservé, et il rapporte.
 */
describeE2e('Espace propriétaire : séjours à la nuit (e2e)', () => {
  let app: INestApplication;
  let context: E2eContext;
  let jeton = '';
  let proprietaireId = '';
  let bienNuitId = '';
  let voyageurId = '';

  const PASSWORD = 'MotDePasse-Solide-2026';
  const JOUR = 24 * 3600 * 1000;
  const minuit = (decalage: number) => {
    const maintenant = new Date();
    return new Date(
      Date.UTC(
        maintenant.getUTCFullYear(),
        maintenant.getUTCMonth(),
        maintenant.getUTCDate(),
      ) +
        decalage * JOUR,
    );
  };

  let numero = 0;
  const sejour = async (
    statut: string,
    arrivee: number,
    depart: number,
    paye = 0,
  ) => {
    numero += 1;
    const cree = await context.prisma.sejourLocatif.create({
      data: {
        referenceInterne: `SJ-TEST-${numero}`,
        bienLocatifId: bienNuitId,
        locataireId: voyageurId,
        dateArrivee: minuit(arrivee),
        dateDepart: minuit(depart),
        nuits: depart - arrivee,
        prixNuit: 45000,
        fraisMenage: 10000,
        montantTotal: 45000 * (depart - arrivee) + 10000,
        statut,
      },
    });
    if (paye > 0) {
      await context.prisma.paiementSejour.create({
        data: {
          sejourId: cree.id,
          datePaiement: new Date(),
          montant: paye,
          type: 'acompte',
          mode: 'virement',
        },
      });
    }
    return cree;
  };

  const lire = async (chemin: string) =>
    request(app.getHttpServer())
      .get(`/api/locatif/proprietaire/${chemin}`)
      .set('Authorization', `Bearer ${jeton}`);

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
    const { data, prisma } = context;
    const roleClient = await data.seedRoleWithPermissions('client', []);
    const proprietaire = await data.seedProprietaire({
      firstName: 'Famille',
      lastName: 'Gaye',
    });
    proprietaireId = proprietaire.id;
    const compte = await data.seedUser({
      email: 'famille.gaye@example.com',
      password: PASSWORD,
      clientProprietaireId: proprietaireId,
    });
    await data.linkUserRole(compte.id, roleClient.id);
    const bien = await prisma.bienLocatif.create({
      data: {
        referenceInterne: 'L-TEST-NUIT',
        proprietaireId,
        type: 'appartement',
        adresse: 'Almadies, résidence Les Palmiers',
        commune: 'Ngor',
        region: 'Dakar',
        modeLocation: 'courte_duree',
        prixNuit: 45000,
      },
    });
    bienNuitId = bien.id;
    const voyageur = await prisma.locataire.create({
      data: {
        firstName: 'Aïssatou',
        lastName: 'Ba',
        email: 'aissatou.ba@example.com',
        phone: '+221771234567',
      },
    });
    voyageurId = voyageur.id;
    const reponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'famille.gaye@example.com', password: PASSWORD });
    jeton = reponse.body.accessToken as string;
  });

  afterAll(async () => {
    await context.close();
  });

  it('un bien à la nuit sans séjour est libre, et non « loué »', async () => {
    const biens = await lire('biens');
    expect(biens.status).toBe(200);
    expect(biens.body[0]).toMatchObject({
      modeLocation: 'courte_duree',
      occupation: 'libre',
      sejours: [],
      sejoursEncaisses: 0,
      bail: null,
    });
    const synthese = await lire('synthese');
    expect(synthese.body).toMatchObject({
      biens: 1,
      loues: 0,
      biensALaNuit: 1,
      sejoursAVenir: 0,
      sejoursEncaisses: 0,
    });
  });

  it('un séjour à venir rend le bien « réservé »', async () => {
    await sejour('confirmee', 5, 9, 50000);
    const biens = await lire('biens');
    expect(biens.body[0].occupation).toBe('reserve');
    expect((await lire('synthese')).body).toMatchObject({
      loues: 0,
      sejoursAVenir: 1,
      sejoursEncaisses: 50000,
    });
  });

  it('un séjour en cours rend le bien « occupé » et compte comme loué', async () => {
    await sejour('en_cours', -1, 3, 100000);
    const biens = await lire('biens');
    expect(biens.body[0].occupation).toBe('occupe');
    // Le statut du bien, lui, reste « disponible » : il n'a pas de bail.
    expect(biens.body[0].statut).not.toBe('loue');
    expect((await lire('synthese')).body).toMatchObject({
      biens: 1,
      loues: 1,
      sejoursAVenir: 1,
      sejoursEncaisses: 150000,
    });
  });

  it('liste les séjours engagés, le séjour en cours d’abord, sans les demandes ni les annulés', async () => {
    await sejour('terminee', -20, -16, 200000);
    await sejour('demande', 20, 22);
    await sejour('annulee', 30, 33, 99999);
    const biens = await lire('biens');
    const sejours = biens.body[0].sejours as {
      statut: string;
      voyageur: string;
      encaisse: number;
    }[];
    expect(sejours.map((s) => s.statut)).toEqual([
      'en_cours',
      'confirmee',
      'terminee',
    ]);
    // Ni la demande ni l'annulation (et son paiement) ne comptent.
    expect(biens.body[0].sejoursEncaisses).toBe(350000);
    expect((await lire('synthese')).body.sejoursEncaisses).toBe(350000);
  });

  it('ne montre du voyageur que son prénom et l’initiale de son nom', async () => {
    const biens = await lire('biens');
    const premier = biens.body[0].sejours[0];
    expect(premier.voyageur).toBe('Aïssatou B.');
    const brut = JSON.stringify(biens.body);
    expect(brut).not.toContain('aissatou.ba@example.com');
    expect(brut).not.toContain('771234567');
    expect(brut).not.toContain('"Ba"');
  });
});
