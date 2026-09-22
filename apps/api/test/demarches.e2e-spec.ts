import { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { createE2eApp, type E2eContext } from './helpers/e2e-app';
import { describeE2e } from './helpers/e2e-database';

/**
 * Parcours J2.2 — démarches administratives et vérification foncière
 * (section 14 du cahier des charges) :
 *  - enregistrement de la demande d'un client de la diaspora ;
 *  - constats de visite et administrations consultées, datés et signés ;
 *  - refus de conclure sans décision ni constat ;
 *  - rapport généré, publié, et lisible par le client dans son espace.
 */
describeE2e('Parcours Démarches J2.2 (e2e)', () => {
  let app: INestApplication;
  let context: E2eContext;
  let data: E2eContext['data'];

  const MOT_DE_PASSE = 'Demarches-E2E-2026!';
  let jetonAgent = '';
  let jetonClient = '';
  let prospectId = '';
  let missionId = '';

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
    data = context.data;

    const role = await data.seedRoleWithPermissions('responsable_demarches', [
      'demarches:consulter',
      'demarches:creer',
      'demarches:modifier',
      'demarches:valider',
      'demarches:publier',
    ]);
    const agent = await data.seedUser({
      email: 'agent.demarches@mtm.test',
      password: await bcrypt.hash(MOT_DE_PASSE, 4),
      firstName: 'Moussa',
      lastName: 'Fall',
    });
    await data.linkUserRole(agent.id, role.id);

    const connexion = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'agent.demarches@mtm.test', password: MOT_DE_PASSE });
    jetonAgent = connexion.body.accessToken;

    const prospect = await context.prisma.prospect.create({
      data: {
        nom: 'Ndiaye',
        prenom: 'Fatou',
        email: 'fatou.diaspora@example.com',
        telephone: '+33600000000',
        statutPipeline: 'nouveau',
      },
    });
    prospectId = prospect.id;

    // Le client a un compte espace client rattaché à sa fiche.
    const clientRole = await data.seedRoleWithPermissions('client', []);
    const client = await data.seedUser({
      email: 'fatou.diaspora@example.com',
      password: await bcrypt.hash(MOT_DE_PASSE, 4),
      firstName: 'Fatou',
      lastName: 'Ndiaye',
      clientProspectId: prospect.id,
    });
    await data.linkUserRole(client.id, clientRole.id);
    const connexionClient = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'fatou.diaspora@example.com', password: MOT_DE_PASSE });
    jetonClient = connexionClient.body.accessToken;
  });

  afterAll(async () => {
    await context.close();
  });

  it('étape 1 — enregistre la demande avec une référence lisible', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/demarches/missions')
      .set('Authorization', `Bearer ${jetonAgent}`)
      .send({
        prospectId,
        typeVerification: 'verification_fonciere',
        objectif:
          'Vérifier le terrain avant tout envoi de fonds depuis la France',
        localisation: 'Mbour, quartier Golf',
        commune: 'Mbour',
        region: 'Thiès',
        urgence: 'urgente',
        piecesFournies: 'Copie du titre foncier transmise par le vendeur',
      });

    expect(response.status).toBe(201);
    expect(response.body.referenceInterne).toMatch(/^V-\d{4}-\d{4}$/);
    expect(response.body.statut).toBe('demande');
    missionId = response.body.id;
  });

  it('refuse un type de vérification hors référentiel', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/demarches/missions')
      .set('Authorization', `Bearer ${jetonAgent}`)
      .send({ prospectId, typeVerification: 'expertise_lunaire' });

    expect(response.status).toBe(400);
  });

  it('étape 2 — enregistre l’étude de faisabilité et le montant convenu', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/demarches/missions/${missionId}`)
      .set('Authorization', `Bearer ${jetonAgent}`)
      .send({
        faisabiliteConclusion: 'favorable',
        montantDevis: 150000,
        fraisEtude: 25000,
        montantPaye: 150000,
        modePaiement: 'virement',
      });

    expect(response.status).toBe(200);
    expect(Number(response.body.montantDevis)).toBe(150000);
  });

  it('refuse de rédiger le rapport tant qu’aucune vérification n’est faite', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/demarches/missions/${missionId}/etape`)
      .set('Authorization', `Bearer ${jetonAgent}`)
      .send({ statut: 'rapport' });

    expect(response.status).toBe(400);
  });

  it('étape 3 — enregistre le constat de visite et fait avancer la mission', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/demarches/missions/${missionId}/etapes`)
      .set('Authorization', `Bearer ${jetonAgent}`)
      .send({
        type: 'verification_physique',
        titre: 'Visite du terrain',
        observations: 'Parcelle libre de toute occupation, bornes visibles.',
        dateVisite: '2026-09-18',
        latitude: 14.42,
        longitude: -16.96,
        accesDescription: 'Piste latéritique praticable',
        conformiteApparente: 'conforme',
      });

    expect(response.status).toBe(201);
    // Le constat porte son auteur : c'est la traçabilité du cahier des charges.
    expect(response.body.realiseePar.lastName).toBe('Fall');

    const mission = await request(app.getHttpServer())
      .get(`/api/demarches/missions/${missionId}`)
      .set('Authorization', `Bearer ${jetonAgent}`);
    expect(mission.body.statut).toBe('verification_physique');
  });

  it('étape 4 — enregistre l’administration consultée', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/demarches/missions/${missionId}/etapes`)
      .set('Authorization', `Bearer ${jetonAgent}`)
      .send({
        type: 'verification_administrative',
        titre: 'Consultation du service des Domaines',
        administration: 'service_domaines',
        interlocuteur: 'M. Sarr',
        resultat: 'confirme',
        observations: 'Titre confirmé, aucune opposition enregistrée.',
      });

    expect(response.status).toBe(201);
    expect(response.body.administration).toBe('service_domaines');
  });

  it('refuse de générer le rapport sans décision de MTM', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/demarches/missions/${missionId}/rapport`)
      .set('Authorization', `Bearer ${jetonAgent}`);

    expect(response.status).toBe(400);
  });

  it('étape 5 — génère le rapport une fois la décision prise', async () => {
    await request(app.getHttpServer())
      .patch(`/api/demarches/missions/${missionId}`)
      .set('Authorization', `Bearer ${jetonAgent}`)
      .send({
        decision: 'favorable',
        conclusion: 'Le terrain correspond aux informations fournies.',
        recommandation:
          'Achat possible sous réserve du bornage contradictoire.',
      });

    const response = await request(app.getHttpServer())
      .post(`/api/demarches/missions/${missionId}/rapport`)
      .set('Authorization', `Bearer ${jetonAgent}`);

    expect(response.status).toBe(201);
    expect(response.body.type).toBe('rapport');
    // Le rapport est le livrable du client : publié d'office.
    expect(response.body.isPublic).toBe(true);
  });

  it('le client retrouve sa mission et son rapport dans son espace', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/demarches/missions/client/missions')
      .set('Authorization', `Bearer ${jetonClient}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    const mission = response.body[0];
    expect(mission.decision).toBe('favorable');
    expect(mission.documents).toHaveLength(1);
    // Les constats internes ne sortent jamais vers le client.
    expect(mission.etapes).toBeUndefined();
  });

  it('clôture la mission, décision prise', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/demarches/missions/${missionId}/etape`)
      .set('Authorization', `Bearer ${jetonAgent}`)
      .send({ statut: 'cloturee' });

    expect(response.status).toBe(200);
    expect(response.body.statut).toBe('cloturee');
  });

  it('archive les actions dans le journal d’audit', async () => {
    const journaux = await context.prisma.auditLog.findMany({
      where: {
        entityType: {
          in: ['MissionVerification', 'EtapeMission', 'DocumentMission'],
        },
      },
      select: { action: true },
    });
    const actions = journaux.map((ligne) => ligne.action);

    expect(actions).toContain('mission.created');
    expect(actions).toContain('mission.etape.created');
    expect(actions).toContain('mission.rapport.genere');
  });
});
