import { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { createE2eApp, type E2eContext } from './helpers/e2e-app';
import { describeE2e } from './helpers/e2e-database';
import { LocatifSchedulerService } from '../src/modules/locatif/locatif-scheduler.service';

/**
 * Parcours J2.1 — gestion locative (section 15 du cahier des charges) :
 *  - un bien locatif est mis en location, avec échéances générées ;
 *  - un loyer est encaissé, validé (section 24), puis quittancé ;
 *  - la caution suit son historique jusqu'à sa restitution ;
 *  - le calendrier de relance alimente la file des impayés ;
 *  - préavis puis sortie libèrent le bien, régularisation calculée ;
 *  - propriétaire et locataire ne voient chacun que ce qui leur revient.
 */
describeE2e('Parcours Gestion locative J2.1 (e2e)', () => {
  let app: INestApplication;
  let context: E2eContext;
  let data: E2eContext['data'];

  const MOT_DE_PASSE = 'Locatif-E2E-2026!';
  let jetonAgent = '';
  let jetonSansLocatif = '';
  let jetonProprietaire = '';
  let jetonLocataire = '';
  let jetonAutreLocataire = '';
  let proprietaireId = '';
  let locataireId = '';
  let bienId = '';
  let bailId = '';

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
    data = context.data;

    const role = await data.seedRoleWithPermissions(
      'responsable_gestion_locative',
      [
        'locatif:consulter',
        'locatif:creer',
        'locatif:modifier',
        'locatif:valider',
        'locatif:publier',
        'locatif:payer',
        'locatif:exporter',
      ],
    );
    const agent = await data.seedUser({
      email: 'agent.locatif@mtm.test',
      password: await bcrypt.hash(MOT_DE_PASSE, 4),
      firstName: 'Fatou',
      lastName: 'Sarr',
    });
    await data.linkUserRole(agent.id, role.id);
    jetonAgent = await connexion('agent.locatif@mtm.test');

    // Collaborateur d'un autre service : la gestion locative doit lui être fermée.
    const roleSansLocatif = await data.seedRoleWithPermissions('commercial', [
      'crm:consulter',
    ]);
    const commercial = await data.seedUser({
      email: 'commercial@mtm.test',
      password: await bcrypt.hash(MOT_DE_PASSE, 4),
      firstName: 'Omar',
      lastName: 'Fall',
    });
    await data.linkUserRole(commercial.id, roleSansLocatif.id);
    jetonSansLocatif = await connexion('commercial@mtm.test');

    const proprietaire = await data.seedProprietaire({
      firstName: 'Moussa',
      lastName: 'Kane',
      email: 'moussa.kane@example.com',
    });
    proprietaireId = proprietaire.id;

    const locataire = await context.prisma.locataire.create({
      data: {
        firstName: 'Aissatou',
        lastName: 'Ba',
        email: 'aissatou.ba@example.com',
      },
    });
    locataireId = locataire.id;

    // Comptes espace propriétaire et espace locataire : même rôle générique
    // « client » que les autres portails (ventes, démarches) — ces routes ne
    // sont gardées par aucune permission, seulement par le compte rattaché.
    const roleClient = await data.seedRoleWithPermissions('client', []);
    const compteProprietaire = await data.seedUser({
      email: 'moussa.kane@example.com',
      password: await bcrypt.hash(MOT_DE_PASSE, 4),
      firstName: 'Moussa',
      lastName: 'Kane',
      clientProprietaireId: proprietaire.id,
    });
    await data.linkUserRole(compteProprietaire.id, roleClient.id);
    jetonProprietaire = await connexion('moussa.kane@example.com');

    const compteLocataire = await data.seedUser({
      email: 'aissatou.ba@example.com',
      password: await bcrypt.hash(MOT_DE_PASSE, 4),
      firstName: 'Aissatou',
      lastName: 'Ba',
      clientLocataireId: locataire.id,
    });
    await data.linkUserRole(compteLocataire.id, roleClient.id);
    jetonLocataire = await connexion('aissatou.ba@example.com');

    // Second locataire, sur aucun bail : il ne doit rien voir du premier.
    const autreLocataire = await context.prisma.locataire.create({
      data: {
        firstName: 'Ibrahima',
        lastName: 'Diop',
        email: 'ibrahima.diop@example.com',
      },
    });
    const compteAutreLocataire = await data.seedUser({
      email: 'ibrahima.diop@example.com',
      password: await bcrypt.hash(MOT_DE_PASSE, 4),
      firstName: 'Ibrahima',
      lastName: 'Diop',
      clientLocataireId: autreLocataire.id,
    });
    await data.linkUserRole(compteAutreLocataire.id, roleClient.id);
    jetonAutreLocataire = await connexion('ibrahima.diop@example.com');
  });

  afterAll(async () => {
    await context.close();
  });

  async function connexion(email: string): Promise<string> {
    const reponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: MOT_DE_PASSE });
    return reponse.body.accessToken as string;
  }

  it('crée un bien locatif avec une référence lisible', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/locatif/biens')
      .set('Authorization', `Bearer ${jetonAgent}`)
      .send({
        proprietaireId,
        type: 'appartement',
        adresse: 'Cité Keur Gorgui, villa 12',
        commune: 'Dakar',
        region: 'Dakar',
      });

    expect(response.status).toBe(201);
    expect(response.body.referenceInterne).toMatch(/^L-\d{4}-\d{4}$/);
    expect(response.body.statut).toBe('disponible');
    bienId = response.body.id;
  });

  it('ferme la gestion locative à un collaborateur sans permission', async () => {
    const liste = await request(app.getHttpServer())
      .get('/api/locatif/biens')
      .set('Authorization', `Bearer ${jetonSansLocatif}`);
    expect(liste.status).toBe(403);

    const fiche = await request(app.getHttpServer())
      .get(`/api/locatif/biens/${bienId}`)
      .set('Authorization', `Bearer ${jetonSansLocatif}`);
    expect(fiche.status).toBe(403);
  });

  it('crée un bail et génère douze échéances mensuelles', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/locatif/biens/${bienId}/baux`)
      .set('Authorization', `Bearer ${jetonAgent}`)
      .send({
        locataireId,
        loyerMensuel: 150000,
        jourEcheance: 5,
        dateDebut: '2026-10-01',
        cautionMontant: 150000,
        cautionDate: '2026-09-28',
      });

    expect(response.status).toBe(201);
    expect(response.body.referenceInterne).toMatch(/^B-\d{4}-\d{4}$/);
    // Caution encaissée à la signature : statut déduit, pas saisi.
    expect(response.body.cautionStatut).toBe('versee');
    bailId = response.body.id;

    const echeances = await request(app.getHttpServer())
      .get(`/api/locatif/baux/${bailId}/echeances`)
      .set('Authorization', `Bearer ${jetonAgent}`);
    expect(echeances.body).toHaveLength(12);
    expect(echeances.body[0].statut).toBe('a_venir');

    const bien = await request(app.getHttpServer())
      .get(`/api/locatif/biens/${bienId}`)
      .set('Authorization', `Bearer ${jetonAgent}`);
    expect(bien.body.statut).toBe('loue');
  });

  it('refuse un second bail actif sur le même bien', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/locatif/biens/${bienId}/baux`)
      .set('Authorization', `Bearer ${jetonAgent}`)
      .send({
        locataireId,
        loyerMensuel: 100000,
        dateDebut: '2026-10-01',
      });
    expect(response.status).toBe(409);
  });

  it('n’impute un encaissement qu’une fois validé (section 24)', async () => {
    const echeances = await request(app.getHttpServer())
      .get(`/api/locatif/baux/${bailId}/echeances`)
      .set('Authorization', `Bearer ${jetonAgent}`);
    const premiereEcheance = echeances.body[0];

    const paiement = await request(app.getHttpServer())
      .post(`/api/locatif/baux/${bailId}/paiements`)
      .set('Authorization', `Bearer ${jetonAgent}`)
      .send({
        type: 'normal',
        montant: 150000,
        modePaiement: 'virement',
        echeanceId: premiereEcheance.id,
        reference: 'VIR-0001',
      });
    expect(paiement.status).toBe(201);
    expect(paiement.body.statut).toBe('en_attente');

    const avantValidation = await request(app.getHttpServer())
      .get(`/api/locatif/baux/${bailId}/echeances`)
      .set('Authorization', `Bearer ${jetonAgent}`);
    expect(avantValidation.body[0].statut).toBe('a_venir');
    expect(Number(avantValidation.body[0].montantPaye)).toBe(0);

    const validation = await request(app.getHttpServer())
      .post(`/api/locatif/baux/${bailId}/paiements/${paiement.body.id}/valider`)
      .set('Authorization', `Bearer ${jetonAgent}`);
    expect(validation.status).toBe(201);

    const apresValidation = await request(app.getHttpServer())
      .get(`/api/locatif/baux/${bailId}/echeances`)
      .set('Authorization', `Bearer ${jetonAgent}`);
    expect(apresValidation.body[0].statut).toBe('payee');
    expect(Number(apresValidation.body[0].montantPaye)).toBe(150000);

    const solde = await request(app.getHttpServer())
      .get(`/api/locatif/baux/${bailId}/solde`)
      .set('Authorization', `Bearer ${jetonAgent}`);
    expect(solde.body.loyersEncaisses).toBe(150000);
  });

  it('expose l’historique des versements au gestionnaire', async () => {
    const paiements = await request(app.getHttpServer())
      .get(`/api/locatif/baux/${bailId}/paiements`)
      .set('Authorization', `Bearer ${jetonAgent}`);
    expect(paiements.status).toBe(200);
    expect(paiements.body).toHaveLength(1);
    expect(paiements.body[0]).toMatchObject({
      statut: 'valide',
      modePaiement: 'virement',
      reference: 'VIR-0001',
    });
  });

  it('génère la quittance et la publie au locataire, pas au propriétaire', async () => {
    const echeances = await request(app.getHttpServer())
      .get(`/api/locatif/baux/${bailId}/echeances`)
      .set('Authorization', `Bearer ${jetonAgent}`);
    const premiereEcheance = echeances.body[0];

    const quittance = await request(app.getHttpServer())
      .post(
        `/api/locatif/baux/${bailId}/echeances/${premiereEcheance.id}/quittance`,
      )
      .set('Authorization', `Bearer ${jetonAgent}`);
    expect(quittance.status).toBe(201);
    expect(quittance.body.type).toBe('quittance');
    expect(quittance.body.visibleLocataire).toBe(true);
    expect(quittance.body.visibleProprietaire).toBe(false);

    const espaceLocataire = await request(app.getHttpServer())
      .get('/api/locatif/locataire/baux')
      .set('Authorization', `Bearer ${jetonLocataire}`);
    expect(espaceLocataire.status).toBe(200);
    expect(espaceLocataire.body).toHaveLength(1);
    expect(espaceLocataire.body[0].documents).toHaveLength(1);
    expect(espaceLocataire.body[0].documents[0].secureUrl).toContain('http');

    const documentsProprietaire = await request(app.getHttpServer())
      .get('/api/locatif/proprietaire/documents')
      .set('Authorization', `Bearer ${jetonProprietaire}`);
    // La quittance du locataire n'a rien à faire dans l'espace du propriétaire.
    expect(documentsProprietaire.body).toHaveLength(0);
  });

  it('montre au locataire sa caution et son solde (section 4)', async () => {
    const espace = await request(app.getHttpServer())
      .get('/api/locatif/locataire/baux')
      .set('Authorization', `Bearer ${jetonLocataire}`);
    const bail = espace.body[0];
    expect(bail.caution).toMatchObject({
      montantPrevu: 150000,
      verse: 150000,
      detenu: 150000,
      statut: 'versee',
    });
    expect(bail.caution.mouvements).toHaveLength(1);
    expect(bail.solde).toMatchObject({ loyersRegles: 150000 });
  });

  it('cloisonne les espaces locataires', async () => {
    const autre = await request(app.getHttpServer())
      .get('/api/locatif/locataire/baux')
      .set('Authorization', `Bearer ${jetonAutreLocataire}`);
    expect(autre.status).toBe(200);
    expect(autre.body).toHaveLength(0);

    const incident = await request(app.getHttpServer())
      .post(`/api/locatif/locataire/baux/${bailId}/incidents`)
      .set('Authorization', `Bearer ${jetonAutreLocataire}`)
      .send({ type: 'plomberie', description: 'Tentative sur un bail tiers' });
    expect(incident.status).toBe(404);

    // Un compte locataire n'accède pas au back-office de la gestion locative.
    const backOffice = await request(app.getHttpServer())
      .get('/api/locatif/biens')
      .set('Authorization', `Bearer ${jetonLocataire}`);
    expect(backOffice.status).toBe(403);
  });

  it('accepte incidents et demandes du locataire (sections 4 et 15)', async () => {
    const incident = await request(app.getHttpServer())
      .post(`/api/locatif/locataire/baux/${bailId}/incidents`)
      .set('Authorization', `Bearer ${jetonLocataire}`)
      .send({
        type: 'plomberie',
        description: 'Fuite sous l’évier de la cuisine',
      });
    expect(incident.status).toBe(201);
    expect(incident.body.nature).toBe('incident');

    const demande = await request(app.getHttpServer())
      .post(`/api/locatif/locataire/baux/${bailId}/incidents`)
      .set('Authorization', `Bearer ${jetonLocataire}`)
      .send({
        nature: 'demande',
        type: 'attestation',
        description: 'Attestation de loyer pour mon employeur',
      });
    expect(demande.status).toBe(201);
    expect(demande.body.nature).toBe('demande');

    const demandes = await request(app.getHttpServer())
      .get('/api/locatif/locataire/incidents?nature=demande')
      .set('Authorization', `Bearer ${jetonLocataire}`);
    expect(demandes.body).toHaveLength(1);

    const cotStaff = await request(app.getHttpServer())
      .get(`/api/locatif/baux/${bailId}/incidents`)
      .set('Authorization', `Bearer ${jetonAgent}`);
    expect(cotStaff.body).toHaveLength(2);
  });

  it('laisse MTM saisir un incident constaté en visite', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/locatif/baux/${bailId}/incidents`)
      .set('Authorization', `Bearer ${jetonAgent}`)
      .send({
        type: 'electricite',
        description: 'Tableau électrique à sécuriser, constaté en visite',
      });
    expect(response.status).toBe(201);
    expect(response.body.reportedBy).not.toBeNull();
  });

  it('publie un relevé de gestion au propriétaire, invisible du locataire', async () => {
    const releve = await request(app.getHttpServer())
      .post(`/api/locatif/biens/${bienId}/releve`)
      .set('Authorization', `Bearer ${jetonAgent}`)
      .send({});
    expect(releve.status).toBe(201);
    expect(releve.body.type).toBe('releve_gestion');
    expect(releve.body.visibleProprietaire).toBe(true);
    expect(releve.body.visibleLocataire).toBe(false);

    const documentsProprietaire = await request(app.getHttpServer())
      .get('/api/locatif/proprietaire/documents')
      .set('Authorization', `Bearer ${jetonProprietaire}`);
    expect(documentsProprietaire.body).toHaveLength(1);
    expect(documentsProprietaire.body[0].secureUrl).toContain('http');

    const espaceLocataire = await request(app.getHttpServer())
      .get('/api/locatif/locataire/baux')
      .set('Authorization', `Bearer ${jetonLocataire}`);
    // Le locataire ne voit que sa quittance, pas le relevé du propriétaire.
    expect(espaceLocataire.body[0].documents).toHaveLength(1);
    expect(espaceLocataire.body[0].documents[0].type).toBe('quittance');
  });

  it('donne au propriétaire les loyers appelés, encaissés et le solde', async () => {
    const biens = await request(app.getHttpServer())
      .get('/api/locatif/proprietaire/biens')
      .set('Authorization', `Bearer ${jetonProprietaire}`);
    expect(biens.status).toBe(200);
    expect(biens.body[0].bail.loyersEncaisses).toBe(150000);
    expect(biens.body[0].bail.loyersDus).toBeGreaterThanOrEqual(150000);

    const synthese = await request(app.getHttpServer())
      .get('/api/locatif/proprietaire/synthese')
      .set('Authorization', `Bearer ${jetonProprietaire}`);
    expect(synthese.body).toMatchObject({ biens: 1, loyersEncaisses: 150000 });
  });

  it('alimente la file de relances selon le calendrier paramétré', async () => {
    // Bien dédié avec un bail démarré dans le passé : ses premières échéances
    // sont impayées, donc relançables.
    const bien = await request(app.getHttpServer())
      .post('/api/locatif/biens')
      .set('Authorization', `Bearer ${jetonAgent}`)
      .send({
        proprietaireId,
        type: 'studio',
        adresse: 'Liberté 6, appartement 3',
        commune: 'Dakar',
      });
    await request(app.getHttpServer())
      .post(`/api/locatif/biens/${bien.body.id}/baux`)
      .set('Authorization', `Bearer ${jetonAgent}`)
      .send({
        locataireId,
        loyerMensuel: 120000,
        jourEcheance: 5,
        dateDebut: '2026-06-01',
      });

    const bilan = await app.get(LocatifSchedulerService).executer();
    expect(bilan.relancesCreees).toBeGreaterThan(0);

    const file = await request(app.getHttpServer())
      .get('/api/locatif/relances')
      .set('Authorization', `Bearer ${jetonAgent}`);
    expect(file.status).toBe(200);
    expect(file.body.length).toBeGreaterThan(0);
    expect(file.body[0].objet).toContain('loyer');

    const envoi = await request(app.getHttpServer())
      .post(`/api/locatif/relances/${file.body[0].id}/envoyer`)
      .set('Authorization', `Bearer ${jetonAgent}`)
      .send({ canal: 'manuel', note: 'Relance remise en main propre' });
    expect(envoi.status).toBe(201);
    expect(envoi.body.statut).toBe('envoyee');

    // Deuxième passage : la relance déjà émise ne repart pas.
    const bilanBis = await app.get(LocatifSchedulerService).executer();
    expect(bilanBis.relancesCreees).toBe(0);
  });

  it('bascule un impayé de longue durée en « impayé prolongé »', async () => {
    const biens = await request(app.getHttpServer())
      .get('/api/locatif/biens?vue=impayes_prolonges')
      .set('Authorization', `Bearer ${jetonAgent}`);
    expect(biens.status).toBe(200);
    // Le bail de juin accumule plus de 60 jours de retard : c'est le cas
    // particulier « impayé prolongé » de la section 15.
    expect(biens.body.total).toBeGreaterThan(0);

    const stats = await request(app.getHttpServer())
      .get('/api/locatif/biens/stats')
      .set('Authorization', `Bearer ${jetonAgent}`);
    expect(stats.body.echeancesEnRetard).toBeGreaterThan(0);
    expect(stats.body.impayesProlonges).toBeGreaterThan(0);
  });

  it('propose le calcul de régularisation avant la sortie', async () => {
    const calcul = await request(app.getHttpServer())
      .get(`/api/locatif/baux/${bailId}/regularisation?dateSortie=2026-12-01`)
      .set('Authorization', `Bearer ${jetonAgent}`);
    expect(calcul.status).toBe(200);
    expect(calcul.body).toMatchObject({
      caution: { disponible: 150000, statut: 'versee' },
    });
    expect(calcul.body).toHaveProperty('retenueCautionProposee');
    expect(calcul.body).toHaveProperty('cautionARembourserProposee');
    expect(calcul.body).toHaveProperty('montantPropose');
  });

  it('préavis puis sortie libèrent le bien et soldent la caution', async () => {
    const preavis = await request(app.getHttpServer())
      .patch(`/api/locatif/baux/${bailId}/preavis`)
      .set('Authorization', `Bearer ${jetonAgent}`)
      .send({ preavisDonneLe: '2026-11-01', preavisDepartPrevu: '2026-12-01' });
    expect(preavis.status).toBe(200);
    expect(preavis.body.statut).toBe('preavis');

    const sortie = await request(app.getHttpServer())
      .post(`/api/locatif/baux/${bailId}/sortie`)
      .set('Authorization', `Bearer ${jetonAgent}`)
      .send({
        dateSortieReelle: '2026-12-01',
        etatLieuxSortie: 'RAS, logement rendu en bon état',
        cautionRetenue: 20000,
        cautionJustification: 'Remise en peinture du salon',
        cautionRembourseeMontant: 130000,
      });
    expect(sortie.status).toBe(201);
    expect(sortie.body.statut).toBe('termine');
    expect(sortie.body.cautionStatut).toBe('partiellement_retenue');

    const caution = await request(app.getHttpServer())
      .get(`/api/locatif/baux/${bailId}/caution`)
      .set('Authorization', `Bearer ${jetonAgent}`);
    // Versement, retenue, remboursement : l'historique exigé par la section 15.
    expect(caution.body.mouvements).toHaveLength(3);
    expect(caution.body.etat.disponible).toBe(0);

    const bien = await request(app.getHttpServer())
      .get(`/api/locatif/biens/${bienId}`)
      .set('Authorization', `Bearer ${jetonAgent}`);
    expect(bien.body.statut).toBe('disponible');
  });

  it('refuse de rendre plus de caution que ce qui est détenu', async () => {
    const bien = await request(app.getHttpServer())
      .post('/api/locatif/biens')
      .set('Authorization', `Bearer ${jetonAgent}`)
      .send({ proprietaireId, type: 'villa', adresse: 'Ngor Almadies' });
    const bail = await request(app.getHttpServer())
      .post(`/api/locatif/biens/${bien.body.id}/baux`)
      .set('Authorization', `Bearer ${jetonAgent}`)
      .send({
        locataireId,
        loyerMensuel: 200000,
        dateDebut: '2026-10-01',
        cautionMontant: 200000,
        cautionDate: '2026-09-30',
      });

    // Un remboursement partiel passe et s'inscrit dans l'historique...
    const partiel = await request(app.getHttpServer())
      .post(`/api/locatif/baux/${bail.body.id}/caution`)
      .set('Authorization', `Bearer ${jetonAgent}`)
      .send({ type: 'remboursement', montant: 50000 });
    expect(partiel.status).toBe(201);
    expect(partiel.body.etat.disponible).toBe(150000);

    // ... mais on ne rend pas plus que ce qui est détenu.
    const trop = await request(app.getHttpServer())
      .post(`/api/locatif/baux/${bail.body.id}/caution`)
      .set('Authorization', `Bearer ${jetonAgent}`)
      .send({ type: 'remboursement', montant: 500000 });
    expect(trop.status).toBe(400);
  });

  it('un changement de locataire clôture l’ancien bail et en ouvre un nouveau', async () => {
    const bien = await request(app.getHttpServer())
      .post('/api/locatif/biens')
      .set('Authorization', `Bearer ${jetonAgent}`)
      .send({
        proprietaireId,
        type: 'studio',
        adresse: 'Sacré-Cœur 3',
        commune: 'Dakar',
      });
    const bail = await request(app.getHttpServer())
      .post(`/api/locatif/biens/${bien.body.id}/baux`)
      .set('Authorization', `Bearer ${jetonAgent}`)
      .send({ locataireId, loyerMensuel: 90000, dateDebut: '2026-10-01' });

    const autreLocataire = await context.prisma.locataire.create({
      data: { firstName: 'Khady', lastName: 'Ndiaye' },
    });

    const changement = await request(app.getHttpServer())
      .post(`/api/locatif/biens/${bien.body.id}/baux/changer-locataire`)
      .set('Authorization', `Bearer ${jetonAgent}`)
      .send({
        dateSortieReelle: '2026-11-15',
        motifCloture: 'Fin de contrat amiable',
        nouveauBail: {
          locataireId: autreLocataire.id,
          loyerMensuel: 95000,
          dateDebut: '2026-11-16',
        },
      });
    expect(changement.status).toBe(201);
    expect(changement.body.locataireId).toBe(autreLocataire.id);

    const historique = await request(app.getHttpServer())
      .get(`/api/locatif/biens/${bien.body.id}/baux`)
      .set('Authorization', `Bearer ${jetonAgent}`);
    expect(historique.body).toHaveLength(2);
    const ancien = historique.body.find(
      (b: { id: string }) => b.id === bail.body.id,
    );
    expect(ancien.statut).toBe('termine');

    // Le bien reste loué, porté par le nouveau bail.
    const bienApres = await request(app.getHttpServer())
      .get(`/api/locatif/biens/${bien.body.id}`)
      .set('Authorization', `Bearer ${jetonAgent}`);
    expect(bienApres.body.statut).toBe('loue');
  });

  it('archive les actions dans le journal d’audit', async () => {
    const journaux = await context.prisma.auditLog.findMany({
      where: {
        entityType: {
          in: [
            'BienLocatif',
            'BailLocatif',
            'PaiementLoyer',
            'DocumentLocatif',
            'IncidentLocatif',
            'RelanceLoyer',
          ],
        },
      },
      select: { action: true },
    });
    const actions = journaux.map((ligne) => ligne.action);

    expect(actions).toContain('bien.created');
    expect(actions).toContain('bail.created');
    expect(actions).toContain('bail.paiement.created');
    expect(actions).toContain('bail.paiement.validated');
    expect(actions).toContain('bail.quittance.generee');
    expect(actions).toContain('bail.incident.created');
    expect(actions).toContain('bail.relance.envoyee');
    expect(actions).toContain('bien.releve_gestion.genere');
    expect(actions).toContain('bail.caution.remboursement');
    expect(actions).toContain('bail.preavis');
    expect(actions).toContain('bail.cloture');
    expect(actions).toContain('bail.locataire_change');
  });
});
