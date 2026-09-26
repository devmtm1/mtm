import { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { createE2eApp, type E2eContext } from './helpers/e2e-app';
import { describeE2e } from './helpers/e2e-database';
import { libelleJalonType } from '../src/modules/construction/construction-options.service';

/**
 * Parcours J2.3 — construction et suivi de chantier (section 16 du cahier
 * des charges) :
 *  - création du projet avec son déroulé type de travaux ;
 *  - planning, journal de chantier et avancement qui se déduit des jalons ;
 *  - budget prévisionnel, dépenses et séparation saisie / contrôle comptable ;
 *  - alertes de retard et de dépassement budgétaire ;
 *  - rapport d'avancement publié et lisible par le client dans son espace,
 *    sans jamais lui exposer le budget interne de MTM.
 */
describeE2e('Parcours Construction J2.3 (e2e)', () => {
  let app: INestApplication;
  let context: E2eContext;
  let data: E2eContext['data'];

  const MOT_DE_PASSE = 'Chantier-E2E-2026!';
  let jetonConducteur = '';
  let jetonComptable = '';
  let jetonClient = '';
  let clientId = '';
  let chantierId = '';
  let jalonFondationsId = '';
  let ligneCimentId = '';
  let depenseId = '';

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
    data = context.data;

    // Le conducteur de travaux pilote le chantier mais n'entérine pas les
    // dépenses : c'est la séparation exigée par la section 24.
    const roleConducteur = await data.seedRoleWithPermissions(
      'responsable_construction',
      [
        'construction:consulter',
        'construction:creer',
        'construction:modifier',
        'construction:valider',
        'construction:publier',
      ],
    );
    const conducteur = await data.seedUser({
      email: 'conducteur@mtm.test',
      password: await bcrypt.hash(MOT_DE_PASSE, 4),
      firstName: 'Ibrahima',
      lastName: 'Sarr',
    });
    await data.linkUserRole(conducteur.id, roleConducteur.id);

    const roleComptable = await data.seedRoleWithPermissions('comptable', [
      'construction:consulter',
      'construction:valider',
      'construction:payer',
    ]);
    const comptable = await data.seedUser({
      email: 'comptable.chantier@mtm.test',
      password: await bcrypt.hash(MOT_DE_PASSE, 4),
      firstName: 'Aïssatou',
      lastName: 'Ba',
    });
    await data.linkUserRole(comptable.id, roleComptable.id);

    const connexion = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'conducteur@mtm.test', password: MOT_DE_PASSE });
    jetonConducteur = connexion.body.accessToken;

    const connexionComptable = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'comptable.chantier@mtm.test', password: MOT_DE_PASSE });
    jetonComptable = connexionComptable.body.accessToken;

    const prospect = await context.prisma.prospect.create({
      data: {
        nom: 'Diallo',
        prenom: 'Mamadou',
        email: 'mamadou.diallo@example.com',
        telephone: '+221770000000',
        statutPipeline: 'client',
      },
    });
    clientId = prospect.id;

    const roleClient = await data.seedRoleWithPermissions('client', []);
    const client = await data.seedUser({
      email: 'mamadou.diallo@example.com',
      password: await bcrypt.hash(MOT_DE_PASSE, 4),
      firstName: 'Mamadou',
      lastName: 'Diallo',
      clientProspectId: prospect.id,
    });
    await data.linkUserRole(client.id, roleClient.id);
    const connexionClient = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'mamadou.diallo@example.com', password: MOT_DE_PASSE });
    jetonClient = connexionClient.body.accessToken;
  });

  afterAll(async () => {
    await context.close();
  });

  // ----------------------------------------------------------------
  // Le projet
  // ----------------------------------------------------------------

  it('crée le chantier avec une référence lisible et le déroulé type', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/construction/chantiers')
      .set('Authorization', `Bearer ${jetonConducteur}`)
      .send({
        clientId,
        intitule: 'Villa R+1 à Ngaparou',
        typeProjet: 'villa',
        programme: 'Quatre chambres, séjour, cuisine, deux salles d’eau',
        commune: 'Ngaparou',
        region: 'Thiès',
        montantDevis: 45_000_000,
        budgetPrevu: 36_000_000,
        dateDebutPrevue: '2026-10-01',
        dateFinPrevue: '2027-06-30',
        avecJalonsType: true,
      });

    expect(response.status).toBe(201);
    expect(response.body.referenceInterne).toMatch(/^C-\d{4}-\d{4}$/);
    expect(response.body.statut).toBe('prepare');
    // Le déroulé type évite neuf saisies manuelles.
    expect(response.body.jalons.length).toBeGreaterThanOrEqual(9);
    chantierId = response.body.id;
  });

  it('refuse un type de projet hors référentiel', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/construction/chantiers')
      .set('Authorization', `Bearer ${jetonConducteur}`)
      .send({
        clientId,
        intitule: 'Station orbitale',
        typeProjet: 'station_spatiale',
      });

    expect(response.status).toBe(400);
  });

  it('refuse une fin de travaux antérieure à leur début', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/construction/chantiers')
      .set('Authorization', `Bearer ${jetonConducteur}`)
      .send({
        clientId,
        intitule: 'Chantier impossible',
        typeProjet: 'villa',
        dateDebutPrevue: '2026-10-01',
        dateFinPrevue: '2026-09-01',
      });

    expect(response.status).toBe(400);
  });

  // ----------------------------------------------------------------
  // Planning et avancement
  // ----------------------------------------------------------------

  it('date une étape du planning et la retrouve dans le chantier', async () => {
    const jalons = await request(app.getHttpServer())
      .get(`/api/construction/chantiers/${chantierId}/jalons`)
      .set('Authorization', `Bearer ${jetonConducteur}`);
    expect(jalons.status).toBe(200);

    const fondations = jalons.body.find(
      (jalon: { libelle: string }) =>
        jalon.libelle === libelleJalonType('fondations'),
    );
    expect(fondations).toBeDefined();
    jalonFondationsId = fondations.id;

    const response = await request(app.getHttpServer())
      .patch(
        `/api/construction/chantiers/${chantierId}/jalons/${jalonFondationsId}`,
      )
      .set('Authorization', `Bearer ${jetonConducteur}`)
      .send({
        // Une échéance déjà passée : c'est elle qui devra déclencher l'alerte.
        dateDebutPrevue: '2026-10-01',
        dateFinPrevue: '2026-11-15',
        poids: 3,
      });

    expect(response.status).toBe(200);
    expect(response.body.poids).toBe(3);
  });

  it('pondère l’avancement par le poids des étapes, pas par leur nombre', async () => {
    // Fondations (poids 3) terminée, huit autres à zéro (poids 1) :
    // 300 / 11 ≈ 27 %, et non 1/9 ≈ 11 %.
    const termine = await request(app.getHttpServer())
      .patch(
        `/api/construction/chantiers/${chantierId}/jalons/${jalonFondationsId}`,
      )
      .set('Authorization', `Bearer ${jetonConducteur}`)
      .send({ statut: 'termine' });
    expect(termine.status).toBe(200);
    // Un jalon terminé vaut 100 % même sans pourcentage saisi.
    expect(termine.body.avancement).toBe(100);
    expect(termine.body.dateFinReelle).not.toBeNull();

    const chantier = await request(app.getHttpServer())
      .get(`/api/construction/chantiers/${chantierId}`)
      .set('Authorization', `Bearer ${jetonConducteur}`);

    expect(chantier.status).toBe(200);
    expect(chantier.body.synthese.avancement.pourcentage).toBe(27);
    expect(chantier.body.synthese.avancement.jalonsTermines).toBe(1);
  });

  // ----------------------------------------------------------------
  // Journal de chantier
  // ----------------------------------------------------------------

  it('consigne une journée et fait remonter son avancement au jalon', async () => {
    const jalons = await request(app.getHttpServer())
      .get(`/api/construction/chantiers/${chantierId}/jalons`)
      .set('Authorization', `Bearer ${jetonConducteur}`);
    const elevation = jalons.body.find(
      (jalon: { libelle: string }) =>
        jalon.libelle === libelleJalonType('elevation'),
    );

    const response = await request(app.getHttpServer())
      .post(`/api/construction/chantiers/${chantierId}/journal`)
      .set('Authorization', `Bearer ${jetonConducteur}`)
      .send({
        date: '2026-09-25',
        jalonId: elevation.id,
        intervenants: 'Équipe maçonnerie, 6 personnes',
        effectif: 6,
        meteo: 'ensoleille',
        avancement: 40,
        observations: 'Élévation des murs du rez-de-chaussée en cours.',
        visibleClient: true,
      });

    expect(response.status).toBe(201);
    expect(response.body.resolu).toBe(true);

    // L'avancement constaté sur le terrain remonte au jalon concerné.
    const apres = await request(app.getHttpServer())
      .get(`/api/construction/chantiers/${chantierId}/jalons`)
      .set('Authorization', `Bearer ${jetonConducteur}`);
    const majElevation = apres.body.find(
      (jalon: { id: string }) => jalon.id === elevation.id,
    );
    expect(majElevation.avancement).toBe(40);
    expect(majElevation.statut).toBe('en_cours');
  });

  it('laisse ouverte une journée qui signale un problème', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/construction/chantiers/${chantierId}/journal`)
      .set('Authorization', `Bearer ${jetonConducteur}`)
      .send({
        date: '2026-09-26',
        probleme: 'Livraison de ciment retardée de trois jours.',
        prochaineAction: 'Relancer le fournisseur lundi.',
      });

    expect(response.status).toBe(201);
    // Personne ne pense à décocher « résolu » : c'est le problème qui
    // ouvre la journée, pas une case à cocher.
    expect(response.body.resolu).toBe(false);

    const problemes = await request(app.getHttpServer())
      .get(`/api/construction/chantiers/${chantierId}/journal?vue=problemes`)
      .set('Authorization', `Bearer ${jetonConducteur}`);
    expect(problemes.body.total).toBe(1);
  });

  it('refuse une journée datée dans le futur', async () => {
    const dansUnMois = new Date(Date.now() + 30 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const response = await request(app.getHttpServer())
      .post(`/api/construction/chantiers/${chantierId}/journal`)
      .set('Authorization', `Bearer ${jetonConducteur}`)
      .send({ date: dansUnMois, observations: 'Prévision' });

    expect(response.status).toBe(400);
  });

  // ----------------------------------------------------------------
  // Budget, prestataires et dépenses
  // ----------------------------------------------------------------

  it('calcule le montant d’un poste depuis sa quantité et son prix unitaire', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/construction/chantiers/${chantierId}/budget/lignes`)
      .set('Authorization', `Bearer ${jetonConducteur}`)
      .send({
        poste: 'materiaux',
        libelle: 'Ciment CEM II',
        quantite: 400,
        unite: 'sac',
        prixUnitaire: 4_500,
      });

    expect(response.status).toBe(201);
    expect(Number(response.body.montantPrevu)).toBe(1_800_000);
    ligneCimentId = response.body.id;
  });

  it('refuse un poste sans montant ni moyen de le calculer', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/construction/chantiers/${chantierId}/budget/lignes`)
      .set('Authorization', `Bearer ${jetonConducteur}`)
      .send({ poste: 'divers', libelle: 'Imprévus' });

    expect(response.status).toBe(400);
  });

  it('n’engage pas le contrat d’un prestataire seulement pressenti', async () => {
    const pressenti = await request(app.getHttpServer())
      .post(`/api/construction/chantiers/${chantierId}/intervenants`)
      .set('Authorization', `Bearer ${jetonConducteur}`)
      .send({
        nom: 'Entreprise Sow',
        metier: 'plomberie',
        montantContrat: 2_000_000,
        statut: 'pressenti',
      });
    expect(pressenti.status).toBe(201);

    const engage = await request(app.getHttpServer())
      .post(`/api/construction/chantiers/${chantierId}/intervenants`)
      .set('Authorization', `Bearer ${jetonConducteur}`)
      .send({
        nom: 'Maçonnerie Ndiaye',
        metier: 'maconnerie',
        montantContrat: 8_000_000,
        statut: 'engage',
      });
    expect(engage.status).toBe(201);

    const chantier = await request(app.getHttpServer())
      .get(`/api/construction/chantiers/${chantierId}`)
      .set('Authorization', `Bearer ${jetonConducteur}`);

    // Seul le contrat signé compte dans les engagements.
    expect(chantier.body.synthese.budget.montantEngage).toBe(8_000_000);
  });

  it('enregistre une dépense en attente : elle ne pèse pas encore sur le budget', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/construction/chantiers/${chantierId}/depenses`)
      .set('Authorization', `Bearer ${jetonConducteur}`)
      .send({
        libelle: '200 sacs de ciment',
        poste: 'materiaux',
        montant: 900_000,
        ligneBudgetId: ligneCimentId,
        modePaiement: 'virement',
      });

    expect(response.status).toBe(201);
    expect(response.body.statut).toBe('en_attente');
    depenseId = response.body.id;

    const chantier = await request(app.getHttpServer())
      .get(`/api/construction/chantiers/${chantierId}`)
      .set('Authorization', `Bearer ${jetonConducteur}`);
    expect(chantier.body.synthese.budget.montantDepense).toBe(0);
    expect(chantier.body.synthese.budget.montantEnAttente).toBe(900_000);
  });

  it('interdit au conducteur de travaux de valider sa propre dépense', async () => {
    const response = await request(app.getHttpServer())
      .post(
        `/api/construction/chantiers/${chantierId}/depenses/${depenseId}/valider`,
      )
      .set('Authorization', `Bearer ${jetonConducteur}`);

    // Celui qui engage n'est pas celui qui entérine (section 24).
    expect(response.status).toBe(403);
  });

  it('la comptabilité valide la dépense, qui pèse alors sur le budget', async () => {
    const response = await request(app.getHttpServer())
      .post(
        `/api/construction/chantiers/${chantierId}/depenses/${depenseId}/valider`,
      )
      .set('Authorization', `Bearer ${jetonComptable}`);

    expect(response.status).toBe(201);
    expect(response.body.statut).toBe('valide');

    const chantier = await request(app.getHttpServer())
      .get(`/api/construction/chantiers/${chantierId}`)
      .set('Authorization', `Bearer ${jetonConducteur}`);
    expect(chantier.body.synthese.budget.montantDepense).toBe(900_000);
    expect(chantier.body.synthese.budget.montantEnAttente).toBe(0);
    // Devis 45 M moins 900 k dépensés.
    expect(chantier.body.synthese.budget.margeEstimee).toBe(44_100_000);
  });

  it('exige un motif pour rejeter une dépense', async () => {
    const saisie = await request(app.getHttpServer())
      .post(`/api/construction/chantiers/${chantierId}/depenses`)
      .set('Authorization', `Bearer ${jetonConducteur}`)
      .send({ libelle: 'Frais divers', poste: 'divers', montant: 50_000 });

    const sansMotif = await request(app.getHttpServer())
      .post(
        `/api/construction/chantiers/${chantierId}/depenses/${saisie.body.id}/rejeter`,
      )
      .set('Authorization', `Bearer ${jetonComptable}`)
      .send({});
    expect(sansMotif.status).toBe(400);

    const avecMotif = await request(app.getHttpServer())
      .post(
        `/api/construction/chantiers/${chantierId}/depenses/${saisie.body.id}/rejeter`,
      )
      .set('Authorization', `Bearer ${jetonComptable}`)
      .send({ motif: 'Justificatif manquant' });
    expect(avecMotif.status).toBe(201);
    expect(avecMotif.body.statut).toBe('rejete');
  });

  // ----------------------------------------------------------------
  // Alertes (section 16)
  // ----------------------------------------------------------------

  it('signale le dépassement du budget une fois le seuil franchi', async () => {
    const grosseDepense = await request(app.getHttpServer())
      .post(`/api/construction/chantiers/${chantierId}/depenses`)
      .set('Authorization', `Bearer ${jetonConducteur}`)
      .send({
        libelle: 'Gros œuvre — solde',
        poste: 'main_oeuvre',
        montant: 36_000_000,
      });

    await request(app.getHttpServer())
      .post(
        `/api/construction/chantiers/${chantierId}/depenses/${grosseDepense.body.id}/valider`,
      )
      .set('Authorization', `Bearer ${jetonComptable}`);

    const chantier = await request(app.getHttpServer())
      .get(`/api/construction/chantiers/${chantierId}`)
      .set('Authorization', `Bearer ${jetonConducteur}`);

    // 36,9 M dépensés sur 36 M budgétés : au-delà du seuil de 100 %.
    expect(chantier.body.synthese.budget.depassement).toBe(true);
    expect(chantier.body.synthese.alertes.depassementBudget).toBe(true);
    expect(chantier.body.situationAlerte).toContain('depassement');
  });

  it('remonte les chantiers en dépassement dans la vue dédiée', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/construction/chantiers?vue=budget_depasse')
      .set('Authorization', `Bearer ${jetonConducteur}`);

    expect(response.status).toBe(200);
    expect(
      response.body.items.some(
        (item: { id: string }) => item.id === chantierId,
      ),
    ).toBe(true);
  });

  // ----------------------------------------------------------------
  // Réception et espace client
  // ----------------------------------------------------------------

  it('refuse la réception tant que le planning n’est pas soldé', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/construction/chantiers/${chantierId}/transition`)
      .set('Authorization', `Bearer ${jetonConducteur}`)
      .send({ statut: 'receptionne' });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('jalon');
  });

  it('génère le rapport d’avancement et le publie au client', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/construction/chantiers/${chantierId}/rapport`)
      .set('Authorization', `Bearer ${jetonConducteur}`);

    expect(response.status).toBe(201);
    expect(response.body.type).toBe('rapport_avancement');
    // Le rapport est le livrable attendu : publié d'office.
    expect(response.body.visibleClient).toBe(true);
    expect(response.body.version).toBe(1);
  });

  it('le client voit son chantier, son planning et le rapport', async () => {
    const liste = await request(app.getHttpServer())
      .get('/api/construction/chantiers/client/chantiers')
      .set('Authorization', `Bearer ${jetonClient}`);

    expect(liste.status).toBe(200);
    expect(liste.body).toHaveLength(1);
    expect(liste.body[0].id).toBe(chantierId);

    const fiche = await request(app.getHttpServer())
      .get(`/api/construction/chantiers/client/chantiers/${chantierId}`)
      .set('Authorization', `Bearer ${jetonClient}`);

    expect(fiche.status).toBe(200);
    expect(fiche.body.jalons.length).toBeGreaterThan(0);
    expect(
      fiche.body.documents.some(
        (d: { type: string }) => d.type === 'rapport_avancement',
      ),
    ).toBe(true);
  });

  it('ne montre au client ni le budget interne, ni la marge, ni les dépenses', async () => {
    const fiche = await request(app.getHttpServer())
      .get(`/api/construction/chantiers/client/chantiers/${chantierId}`)
      .set('Authorization', `Bearer ${jetonClient}`);

    // Le client a signé un devis : c'est le seul montant qui le concerne.
    expect(fiche.body.montantDevis).toBe(45_000_000);
    expect(fiche.body.budgetPrevu).toBeUndefined();
    expect(fiche.body.montantDepense).toBeUndefined();
    expect(fiche.body.synthese).toBeUndefined();
    expect(fiche.body.depenses).toBeUndefined();
    expect(fiche.body.lignesBudget).toBeUndefined();
    expect(fiche.body.intervenants).toBeUndefined();
  });

  it('ne publie au client que les journées explicitement partagées', async () => {
    const fiche = await request(app.getHttpServer())
      .get(`/api/construction/chantiers/client/chantiers/${chantierId}`)
      .set('Authorization', `Bearer ${jetonClient}`);

    // Deux journées saisies, une seule publiée — et le problème interne
    // n'en fait pas partie.
    expect(fiche.body.journal).toHaveLength(1);
    expect(fiche.body.journal[0].observations).toContain('Élévation');
  });

  it('refuse à un autre client l’accès à ce chantier', async () => {
    const roleAutre = await data.seedRoleWithPermissions('client-autre', []);
    const autreProspect = await context.prisma.prospect.create({
      data: {
        nom: 'Sy',
        prenom: 'Ousmane',
        email: 'ousmane.sy@example.com',
        statutPipeline: 'nouveau',
      },
    });
    const autre = await data.seedUser({
      email: 'ousmane.sy@example.com',
      password: await bcrypt.hash(MOT_DE_PASSE, 4),
      firstName: 'Ousmane',
      lastName: 'Sy',
      clientProspectId: autreProspect.id,
    });
    await data.linkUserRole(autre.id, roleAutre.id);
    const connexion = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'ousmane.sy@example.com', password: MOT_DE_PASSE });

    const fiche = await request(app.getHttpServer())
      .get(`/api/construction/chantiers/client/chantiers/${chantierId}`)
      .set('Authorization', `Bearer ${connexion.body.accessToken}`);

    expect(fiche.status).toBe(404);
  });

  it('archive plutôt que de supprimer un chantier portant des dépenses validées', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/api/construction/chantiers/${chantierId}`)
      .set('Authorization', `Bearer ${jetonConducteur}`);

    // Pas de permission de suppression pour ce rôle, et de toute façon le
    // chantier porte des dépenses validées.
    expect([403, 409]).toContain(response.status);
  });
});
