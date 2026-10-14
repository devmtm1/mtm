// Six comptes se connectent à la suite : on relève la limite de connexions.
process.env.LOGIN_RATE_LIMIT_MAX = '100';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2eApp, type E2eContext } from './helpers/e2e-app';
import { describeE2e } from './helpers/e2e-database';
import { AgendaSchedulerService } from '../src/modules/agenda/agenda-scheduler.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { TachesSchedulerService } from '../src/modules/taches/taches-scheduler.service';

/**
 * J2.4 — tâches assignables, agenda partagé, fils de discussion par dossier,
 * règles de notification et parcours configurables.
 */
describeE2e('Agenda, tâches, messages et notifications (e2e)', () => {
  let app: INestApplication;
  let context: E2eContext;
  let tokenA: string; // commercial, responsable du prospect P1
  let tokenB: string; // commercial, collègue
  let tokenC: string; // commercial, sans lien avec P1
  let tokenManager: string;
  let tokenClient: string;
  let tokenAutreClient: string;
  let idA = '';
  let idB = '';
  let idC = '';
  let idManager = '';
  let prospectId = '';
  let venteId = '';
  let terrainId = '';

  const PASSWORD = 'MotDePasse-Solide-2026';

  const login = async (email: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: PASSWORD });
    expect(response.status).toBe(201);
    return response.body.accessToken as string;
  };

  const api = (
    methode: 'get' | 'post' | 'patch' | 'put' | 'delete',
    chemin: string,
    token: string,
  ) =>
    request(app.getHttpServer())
      [methode](`/api${chemin}`)
      .set('Authorization', `Bearer ${token}`);

  const notifications = (userId: string, type?: string) =>
    context.prisma.notification.findMany({
      where: { userId, ...(type ? { type } : {}) },
      orderBy: { createdAt: 'asc' },
    });

  const demain = () => new Date(Date.now() + 24 * 3600 * 1000).toISOString();

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
    const { data } = context;

    const base = [
      'taches:consulter',
      'taches:creer',
      'taches:modifier',
      'agenda:consulter',
      'agenda:creer',
      'agenda:modifier',
      'messages:consulter',
      'messages:creer',
      'crm:consulter',
      'ventes:consulter',
      'terrains:consulter',
    ];
    const roleCommercial = await data.seedRoleWithPermissions(
      'commercial',
      base,
    );
    const roleManager = await data.seedRoleWithPermissions('manager', [
      ...base,
      'taches:administrer',
      'taches:supprimer',
      'agenda:administrer',
      'notifications:administrer',
      'settings:consulter',
      'settings:modifier',
      'crm:administrer',
    ]);
    const roleClient = await data.seedRoleWithPermissions('client', []);

    const creer = async (
      email: string,
      prenom: string,
      role: { id: string },
    ) => {
      const user = await data.seedUser({
        email,
        password: PASSWORD,
        firstName: prenom,
      });
      await data.linkUserRole(user.id, role.id);
      return user.id;
    };
    idA = await creer('a@mtm.test', 'Awa', roleCommercial);
    idB = await creer('b@mtm.test', 'Boubacar', roleCommercial);
    idC = await creer('c@mtm.test', 'Coumba', roleCommercial);
    idManager = await creer('m@mtm.test', 'Moussa', roleManager);

    const prospect = await context.prisma.prospect.create({
      data: {
        nom: 'Diallo',
        prenom: 'Fatou',
        email: 'fatou@client.test',
        statutPipeline: 'nouveau',
        commercialResponsableId: idA,
      },
    });
    prospectId = prospect.id;
    const vente = await context.prisma.dossierVente.create({
      data: {
        prospectId,
        commercialResponsableId: idA,
        referenceInterne: 'DV-E2E0001',
        statut: 'reserve',
      },
    });
    venteId = vente.id;
    const terrain = await context.prisma.terrain.create({
      data: {
        referenceInterne: 'TR-E2E-1',
        nom: 'Terrain test',
        statutJuridique: 'Titre foncier',
        niveauVerification: 'Non vérifié',
        statutCommercial: 'Disponible',
        commercialResponsableId: idA,
      },
    });
    terrainId = terrain.id;

    const client = await data.seedUser({
      email: 'fatou@client.test',
      password: PASSWORD,
      firstName: 'Fatou',
      clientProspectId: prospectId,
    });
    await data.linkUserRole(client.id, roleClient.id);
    const autreProspect = await context.prisma.prospect.create({
      data: { nom: 'Sy', email: 'sy@client.test', statutPipeline: 'nouveau' },
    });
    const autre = await data.seedUser({
      email: 'sy@client.test',
      password: PASSWORD,
      firstName: 'Ousmane',
      clientProspectId: autreProspect.id,
    });
    await data.linkUserRole(autre.id, roleClient.id);

    tokenA = await login('a@mtm.test');
    tokenB = await login('b@mtm.test');
    tokenC = await login('c@mtm.test');
    tokenManager = await login('m@mtm.test');
    tokenClient = await login('fatou@client.test');
    tokenAutreClient = await login('sy@client.test');
  });

  afterAll(async () => {
    await context.close();
  });

  // ------------------------------------------------------------------
  describe('tâches', () => {
    let tacheId = '';

    it('une tâche confiée à un collègue le prévient', async () => {
      const reponse = await api('post', '/taches', tokenA).send({
        titre: 'Relancer le notaire',
        priorite: 'haute',
        dateLimite: demain(),
        responsableId: idB,
      });
      expect(reponse.status).toBe(201);
      expect(reponse.body).toMatchObject({
        titre: 'Relancer le notaire',
        priorite: 'haute',
        statut: 'a_faire',
        responsableId: idB,
        peutModifier: true,
      });
      tacheId = reponse.body.id;

      const recues = await notifications(idB, 'tache_assignee');
      expect(recues).toHaveLength(1);
      expect(recues[0].titre).toContain('Relancer le notaire');
      expect(recues[0].lien).toBe(`/taches?tache=${tacheId}`);
      // Celui qui crée n'est pas notifié de sa propre action.
      expect(await notifications(idA, 'tache_assignee')).toHaveLength(0);
    });

    it('chacun voit les siennes ; un étranger ne voit pas la tâche', async () => {
      const miennes = await api('get', '/taches', tokenB);
      expect(miennes.body.items.map((t: { id: string }) => t.id)).toContain(
        tacheId,
      );
      const confiees = await api('get', '/taches?scope=creees', tokenA);
      expect(confiees.body.items.map((t: { id: string }) => t.id)).toContain(
        tacheId,
      );
      expect((await api('get', `/taches/${tacheId}`, tokenC)).status).toBe(404);
    });

    it('la vue d’équipe est réservée à l’encadrement', async () => {
      expect((await api('get', '/taches?scope=equipe', tokenA)).status).toBe(
        403,
      );
      const equipe = await api('get', '/taches?scope=equipe', tokenManager);
      expect(equipe.status).toBe(200);
      expect(equipe.body.items.map((t: { id: string }) => t.id)).toContain(
        tacheId,
      );
      expect(
        (await api('get', `/taches?responsableId=${idB}`, tokenA)).status,
      ).toBe(403);
    });

    it('refuse de confier une tâche à un compte client ou inconnu', async () => {
      const client = await context.prisma.user.findFirstOrThrow({
        where: { email: 'fatou@client.test' },
      });
      expect(
        (
          await api('post', '/taches', tokenA).send({
            titre: 'Pour un client',
            responsableId: client.id,
          })
        ).status,
      ).toBe(400);
    });

    it('le responsable termine la tâche, l’historique garde la trace', async () => {
      const fin = await api('patch', `/taches/${tacheId}`, tokenB).send({
        statut: 'terminee',
      });
      expect(fin.status).toBe(200);
      expect(fin.body.statut).toBe('terminee');
      expect(fin.body.termineeLe).not.toBeNull();

      const commentaire = await api(
        'post',
        `/taches/${tacheId}/commentaires`,
        tokenB,
      ).send({ texte: 'Notaire relancé, réponse attendue lundi' });
      expect(commentaire.status).toBe(201);
      const actions = commentaire.body.historique.map(
        (h: { action: string }) => h.action,
      );
      expect(actions).toEqual(['creee', 'statut', 'commentaire']);

      const rouverte = await api('patch', `/taches/${tacheId}`, tokenB).send({
        statut: 'en_cours',
      });
      expect(rouverte.body.termineeLe).toBeNull();
    });

    it('un collègue sans lien ne modifie pas une tâche, l’encadrement le peut', async () => {
      expect(
        (
          await api('patch', `/taches/${tacheId}`, tokenC).send({
            titre: 'x x',
          })
        ).status,
      ).toBe(404);
      const reassignee = await api(
        'patch',
        `/taches/${tacheId}`,
        tokenManager,
      ).send({ responsableId: idC });
      expect(reassignee.status).toBe(200);
      expect(reassignee.body.responsableId).toBe(idC);
      expect(await notifications(idC, 'tache_assignee')).toHaveLength(1);
    });

    it('rattache une tâche à un dossier, dans le périmètre de la personne seulement', async () => {
      const ok = await api('post', '/taches', tokenA).send({
        titre: 'Préparer le contrat',
        entityType: 'vente',
        entityId: venteId,
      });
      expect(ok.status).toBe(201);
      expect(ok.body.entityLabel).toBe('DV-E2E0001');

      // C n'est pas le commercial de cette vente : le dossier n'existe pas pour lui.
      const refus = await api('post', '/taches', tokenC).send({
        titre: 'Intrus',
        entityType: 'vente',
        entityId: venteId,
      });
      expect(refus.status).toBe(404);

      const duDossier = await api(
        'get',
        `/taches?entityType=vente&entityId=${venteId}`,
        tokenA,
      );
      expect(duDossier.body.total).toBe(1);
      expect(
        (
          await api(
            'get',
            `/taches?entityType=vente&entityId=${venteId}`,
            tokenC,
          )
        ).status,
      ).toBe(404);
      expect(
        (
          await api('post', '/taches', tokenA).send({
            titre: 'Type inconnu',
            entityType: 'planete',
            entityId: venteId,
          })
        ).status,
      ).toBe(400);
    });

    it('relance une tâche en retard une seule fois par jour, responsable et auteur prévenus', async () => {
      const retard = await api('post', '/taches', tokenA).send({
        titre: 'Payer la taxe',
        responsableId: idB,
        dateLimite: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      });
      const planificateur = app.get(TachesSchedulerService);
      const premier = await planificateur.executer();
      expect(premier.enRetard).toBeGreaterThanOrEqual(1);
      await planificateur.executer();

      const chezB = (await notifications(idB, 'tache_en_retard')).filter(
        (n) => n.entityId === retard.body.id,
      );
      const chezA = (await notifications(idA, 'tache_en_retard')).filter(
        (n) => n.entityId === retard.body.id,
      );
      expect(chezB).toHaveLength(1);
      expect(chezA).toHaveLength(1);
      expect(chezB[0].niveau).toBe('alerte');

      const resume = await api('get', '/taches/resume', tokenB);
      expect(resume.body.enRetard).toBeGreaterThanOrEqual(1);
    });

    it('seul qui a le droit de supprimer supprime', async () => {
      const t = await api('post', '/taches', tokenA).send({ titre: 'À jeter' });
      expect((await api('delete', `/taches/${t.body.id}`, tokenA)).status).toBe(
        403,
      );
      expect(
        (await api('delete', `/taches/${t.body.id}`, tokenManager)).status,
      ).toBe(204);
    });

    it('valide les données saisies', async () => {
      expect(
        (await api('post', '/taches', tokenA).send({ titre: 'x' })).status,
      ).toBe(400);
      expect(
        (
          await api('post', '/taches', tokenA).send({
            titre: 'Titre valide',
            priorite: 'critique',
          })
        ).status,
      ).toBe(400);
    });
  });

  // ------------------------------------------------------------------
  describe('agenda', () => {
    let evenementId = '';
    let privéId = '';

    it('crée un événement partagé avec participants, qui sont invités', async () => {
      const debut = new Date(Date.now() + 3 * 24 * 3600 * 1000);
      const reponse = await api('post', '/agenda/evenements', tokenA).send({
        type: 'rendez_vous',
        titre: 'Signature chez le notaire',
        lieu: 'Étude Ndiaye, Dakar',
        debut: debut.toISOString(),
        fin: new Date(debut.getTime() + 3600_000).toISOString(),
        participantIds: [idB],
        entityType: 'vente',
        entityId: venteId,
        rappelMinutes: 60,
      });
      expect(reponse.status).toBe(201);
      expect(reponse.body).toMatchObject({
        source: 'evenement',
        type: 'rendez_vous',
        modifiable: true,
        entityLabel: 'DV-E2E0001',
        lien: `/ventes/${venteId}`,
      });
      evenementId = reponse.body.id;
      expect(await notifications(idB, 'evenement_invitation')).toHaveLength(1);
    });

    it('un événement privé n’existe que pour son organisateur et ses participants', async () => {
      const debut = new Date(Date.now() + 3 * 24 * 3600 * 1000);
      const prive = await api('post', '/agenda/evenements', tokenA).send({
        type: 'appel',
        titre: 'Appel personnel',
        debut: debut.toISOString(),
        visibilite: 'prive',
      });
      privéId = prive.body.id;

      const fenetre = `du=${new Date().toISOString()}&au=${new Date(
        Date.now() + 10 * 24 * 3600 * 1000,
      ).toISOString()}`;
      const vueC = await api('get', `/agenda?${fenetre}&scope=equipe`, tokenC);
      const titresC = vueC.body.map((i: { titre: string }) => i.titre);
      expect(titresC).toContain('Signature chez le notaire');
      expect(titresC).not.toContain('Appel personnel');

      const vueA = await api('get', `/agenda?${fenetre}&scope=moi`, tokenA);
      expect(vueA.body.map((i: { titre: string }) => i.titre)).toEqual(
        expect.arrayContaining([
          'Signature chez le notaire',
          'Appel personnel',
        ]),
      );
      expect(
        (await api('get', `/agenda/evenements/${privéId}`, tokenC)).status,
      ).toBe(404);
      // « Mon agenda » ne montre pas les événements des autres.
      const vueMoiC = await api('get', `/agenda?${fenetre}&scope=moi`, tokenC);
      expect(vueMoiC.body.map((i: { titre: string }) => i.titre)).not.toContain(
        'Signature chez le notaire',
      );
    });

    it('ajoute à l’agenda les échéances des autres modules, dans le périmètre', async () => {
      await context.prisma.echeancePaiement.create({
        data: {
          dossierVenteId: venteId,
          numero: 1,
          dateEcheance: new Date(Date.now() + 2 * 24 * 3600 * 1000),
          montantPrevu: 100000,
          statut: 'en_attente',
        },
      });
      await api('post', '/taches', tokenA).send({
        titre: 'Envoyer le plan de masse',
        dateLimite: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
      });
      await context.prisma.visiteProspect.create({
        data: {
          prospectId,
          terrainId,
          statut: 'programmee',
          dateConfirmee: new Date(Date.now() + 4 * 24 * 3600 * 1000),
          heure: '10:30',
          lieuRendezVous: 'Sur le terrain',
          accompagnateurId: idA,
        },
      });
      const fenetre = `du=${new Date().toISOString()}&au=${new Date(
        Date.now() + 10 * 24 * 3600 * 1000,
      ).toISOString()}`;
      const vueA = await api('get', `/agenda?${fenetre}`, tokenA);
      const sources = vueA.body.map((i: { source: string }) => i.source);
      expect(sources).toEqual(
        expect.arrayContaining([
          'evenement',
          'tache',
          'echeance_vente',
          'visite',
        ]),
      );
      const visite = vueA.body.find(
        (i: { source: string }) => i.source === 'visite',
      );
      expect(visite.titre).toContain('TR-E2E-1');
      expect(visite.modifiable).toBe(false);

      // C n'a ni la vente ni la visite dans son périmètre.
      const vueC = await api('get', `/agenda?${fenetre}`, tokenC);
      const sourcesC = vueC.body.map((i: { source: string }) => i.source);
      expect(sourcesC).not.toContain('echeance_vente');
      expect(sourcesC).not.toContain('visite');
    });

    it('limite la période demandée', async () => {
      const trop = await api(
        'get',
        `/agenda?du=2026-01-01T00:00:00Z&au=2026-12-31T00:00:00Z`,
        tokenA,
      );
      expect(trop.status).toBe(400);
      expect(
        (
          await api(
            'get',
            `/agenda?du=2026-02-01T00:00:00Z&au=2026-01-01T00:00:00Z`,
            tokenA,
          )
        ).status,
      ).toBe(400);
    });

    it('seul l’organisateur ou l’encadrement modifie un événement', async () => {
      expect(
        (
          await api('patch', `/agenda/evenements/${evenementId}`, tokenB).send({
            titre: 'Détourné',
          })
        ).status,
      ).toBe(403);
      const ok = await api(
        'patch',
        `/agenda/evenements/${evenementId}`,
        tokenManager,
      ).send({ lieu: 'Étude Ndiaye, Plateau' });
      expect(ok.status).toBe(200);
      expect(ok.body.lieu).toBe('Étude Ndiaye, Plateau');
      expect(
        (
          await api('patch', `/agenda/evenements/${evenementId}`, tokenA).send({
            fin: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
          })
        ).status,
      ).toBe(400);
    });

    it('envoie le rappel une seule fois', async () => {
      const bientot = await api('post', '/agenda/evenements', tokenA).send({
        type: 'reunion',
        titre: 'Point hebdomadaire',
        debut: new Date(Date.now() + 20 * 60_000).toISOString(),
        participantIds: [idB],
        rappelMinutes: 30,
      });
      const planificateur = app.get(AgendaSchedulerService);
      expect(await planificateur.executer()).toBeGreaterThanOrEqual(1);
      expect(await planificateur.executer()).toBe(0);
      const chezB = (await notifications(idB, 'rappel_evenement')).filter(
        (n) => n.entityId === bientot.body.id,
      );
      expect(chezB).toHaveLength(1);
      // L'événement du week-end, dont le rappel est à 60 minutes, n'est pas encore parti.
      const lointain = (await notifications(idB, 'rappel_evenement')).filter(
        (n) => n.entityId === evenementId,
      );
      expect(lointain).toHaveLength(0);
    });

    it('supprime un événement', async () => {
      expect(
        (await api('delete', `/agenda/evenements/${privéId}`, tokenA)).status,
      ).toBe(204);
      expect(
        (await api('get', `/agenda/evenements/${privéId}`, tokenA)).status,
      ).toBe(404);
    });
  });

  // ------------------------------------------------------------------
  describe('messages par dossier', () => {
    it('une note interne n’est jamais lue par le client', async () => {
      const note = await api('post', `/messages/vente/${venteId}`, tokenA).send(
        {
          corps: 'Le client hésite, rappeler jeudi',
        },
      );
      expect(note.status).toBe(201);
      expect(note.body.visibleClient).toBe(false);

      const cote = await api(
        'get',
        `/messages/client/vente/${venteId}`,
        tokenClient,
      );
      expect(cote.status).toBe(200);
      expect(cote.body.items).toHaveLength(0);
    });

    it('un message au client lui est notifié et lisible dans son espace', async () => {
      const message = await api(
        'post',
        `/messages/vente/${venteId}`,
        tokenA,
      ).send({
        corps: 'Bonjour, votre contrat est prêt à être signé.',
        visibleClient: true,
      });
      expect(message.status).toBe(201);

      const cote = await api(
        'get',
        `/messages/client/vente/${venteId}`,
        tokenClient,
      );
      expect(cote.body.items).toHaveLength(1);
      expect(cote.body.items[0]).toMatchObject({
        corps: 'Bonjour, votre contrat est prêt à être signé.',
        deClient: false,
        auteur: 'Awa',
      });
      const client = await context.prisma.user.findFirstOrThrow({
        where: { email: 'fatou@client.test' },
      });
      const recues = await notifications(client.id, 'message_mtm');
      expect(recues).toHaveLength(1);
      expect(recues[0].lien).toBe('/espace-client/dossiers');
    });

    it('le client répond, l’équipe du dossier est prévenue', async () => {
      const reponse = await api(
        'post',
        `/messages/client/vente/${venteId}`,
        tokenClient,
      ).send({ corps: 'Merci, je passe signer demain.' });
      expect(reponse.status).toBe(201);
      expect(reponse.body.auteur).toBe('Vous');

      const chezA = await notifications(idA, 'message_dossier');
      expect(chezA.some((n) => n.titre.includes('Fatou'))).toBe(true);
      expect(chezA.find((n) => n.titre.includes('Fatou'))?.lien).toBe(
        `/ventes/${venteId}`,
      );

      const fil = await api('get', `/messages/vente/${venteId}`, tokenA);
      expect(fil.body.items).toHaveLength(3);
      expect(fil.body.clientPeutLire).toBe(true);
    });

    it('un autre client, ou un collègue hors périmètre, n’a aucun accès', async () => {
      expect(
        (
          await api(
            'get',
            `/messages/client/vente/${venteId}`,
            tokenAutreClient,
          )
        ).status,
      ).toBe(404);
      expect(
        (
          await api(
            'post',
            `/messages/client/vente/${venteId}`,
            tokenAutreClient,
          ).send({ corps: 'Intrus' })
        ).status,
      ).toBe(404);
      expect(
        (await api('get', `/messages/vente/${venteId}`, tokenC)).status,
      ).toBe(404);
      // Un compte du personnel n'est pas un client.
      expect(
        (await api('get', `/messages/client/vente/${venteId}`, tokenA)).status,
      ).toBe(404);
    });

    it('un type de dossier sans espace client reste interne', async () => {
      const refus = await api(
        'post',
        `/messages/terrain/${terrainId}`,
        tokenA,
      ).send({
        corps: 'Pour le client ?',
        visibleClient: true,
      });
      expect(refus.status).toBe(400);
      const interne = await api(
        'post',
        `/messages/terrain/${terrainId}`,
        tokenA,
      ).send({
        corps: 'Titre foncier à vérifier',
      });
      expect(interne.status).toBe(201);
      expect(
        (await api('get', `/messages/client/terrain/${terrainId}`, tokenClient))
          .status,
      ).toBe(404);
    });

    it('arrête un client qui écrit trop vite', async () => {
      let dernier = 0;
      for (let i = 0; i < 6; i += 1) {
        const r = await api(
          'post',
          `/messages/client/vente/${venteId}`,
          tokenClient,
        ).send({ corps: `Message ${i}` });
        dernier = r.status;
      }
      expect(dernier).toBe(429);
    });

    it('refuse un message vide ou démesuré', async () => {
      expect(
        (
          await api('post', `/messages/vente/${venteId}`, tokenA).send({
            corps: '',
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await api('post', `/messages/vente/${venteId}`, tokenA).send({
            corps: 'x'.repeat(5000),
          })
        ).status,
      ).toBe(400);
      expect(
        (await api('get', `/messages/inconnu/${venteId}`, tokenA)).status,
      ).toBe(400);
    });
  });

  // ------------------------------------------------------------------
  describe('règles et préférences de notification', () => {
    it('le catalogue est réservé à qui administre les notifications', async () => {
      expect((await api('get', '/notifications/regles', tokenA)).status).toBe(
        403,
      );
      const catalogue = await api('get', '/notifications/regles', tokenManager);
      expect(catalogue.status).toBe(200);
      const cles = catalogue.body.evenements.map((e: { cle: string }) => e.cle);
      expect(cles).toEqual(
        expect.arrayContaining([
          'nouveau_prospect',
          'paiement_a_valider',
          'mandat_echeance',
          'tache_en_retard',
          'message_dossier',
          'document_manquant',
        ]),
      );
      expect(catalogue.body.canaux).toEqual({
        email: true,
        sms: false,
        whatsapp: false,
      });
    });

    it('désactiver un événement empêche son envoi', async () => {
      const regle = await api(
        'put',
        '/notifications/regles',
        tokenManager,
      ).send({
        regles: { tache_assignee: { actif: false } },
      });
      expect(regle.status).toBe(200);
      const avant = (await notifications(idB, 'tache_assignee')).length;
      await api('post', '/taches', tokenA).send({
        titre: 'Tâche muette',
        responsableId: idB,
      });
      expect(await notifications(idB, 'tache_assignee')).toHaveLength(avant);

      await api('put', '/notifications/regles', tokenManager).send({
        regles: {},
      });
      await api('post', '/taches', tokenA).send({
        titre: 'Tâche entendue',
        responsableId: idB,
      });
      expect(await notifications(idB, 'tache_assignee')).toHaveLength(
        avant + 1,
      );
    });

    it('rejette un événement ou une permission inconnus', async () => {
      expect(
        (
          await api('put', '/notifications/regles', tokenManager).send({
            regles: { evenement_fantome: { actif: true } },
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await api('put', '/notifications/regles', tokenManager).send({
            regles: { nouveau_prospect: { permission: 'nimporte:quoi' } },
          })
        ).status,
      ).toBe(400);
      // Un événement adressé à une personne n'a pas de permission à régler.
      expect(
        (
          await api('put', '/notifications/regles', tokenManager).send({
            regles: { tache_assignee: { permission: 'crm:consulter' } },
          })
        ).status,
      ).toBe(400);
    });

    it('confie un événement à une autre permission', async () => {
      const service = app.get(NotificationsService);
      const envoyer = () =>
        service.notifierPermission('crm:administrer', {
          type: 'nouveau_prospect',
          titre: 'Nouveau prospect : Test Règle',
        });

      // Par défaut : les titulaires de crm:administrer (ici le manager).
      await envoyer();
      const parDefautManager = await notifications(
        idManager,
        'nouveau_prospect',
      );
      expect(parDefautManager).toHaveLength(1);

      // Réglé sur une autre permission : la reçoivent ceux qui la détiennent (A et le manager).
      const regle = await api(
        'put',
        '/notifications/regles',
        tokenManager,
      ).send({
        regles: { nouveau_prospect: { permission: 'agenda:modifier' } },
      });
      expect(regle.status).toBe(200);
      await envoyer();
      expect(await notifications(idA, 'nouveau_prospect')).toHaveLength(1);
      expect(await notifications(idManager, 'nouveau_prospect')).toHaveLength(
        2,
      );

      await api('put', '/notifications/regles', tokenManager).send({
        regles: {},
      });
    });

    it('chacun règle ses canaux ; SMS et WhatsApp demandent un numéro valide', async () => {
      const lu = await api('get', '/notifications/preferences', tokenB);
      expect(lu.body).toMatchObject({
        email: true,
        sms: false,
        whatsapp: false,
        telephone: '',
      });
      expect(
        (
          await api('put', '/notifications/preferences', tokenB).send({
            sms: true,
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await api('put', '/notifications/preferences', tokenB).send({
            telephone: 'pas un numéro',
          })
        ).status,
      ).toBe(400);
      const ok = await api('put', '/notifications/preferences', tokenB).send({
        telephone: '+221 77 123 45 67',
        sms: true,
        email: false,
      });
      expect(ok.status).toBe(200);
      expect(ok.body).toMatchObject({
        telephone: '+221 77 123 45 67',
        sms: true,
        email: false,
      });
      // Effacer le numéro coupe les canaux qui en dépendent.
      const efface = await api(
        'put',
        '/notifications/preferences',
        tokenB,
      ).send({
        telephone: '',
      });
      expect(efface.body).toMatchObject({
        sms: false,
        whatsapp: false,
        telephone: '',
      });
    });
  });

  // ------------------------------------------------------------------
  describe('parcours configurables', () => {
    it('liste les parcours avec leurs étapes protégées et leur usage', async () => {
      const liste = await api('get', '/workflows', tokenManager);
      expect(liste.status).toBe(200);
      const ventes = liste.body.find(
        (w: { module: string }) => w.module === 'ventes',
      );
      expect(ventes.statuts).toEqual(
        expect.arrayContaining(['en_cours', 'solde']),
      );
      expect(ventes.obligatoires).toContain('annule');
      expect(ventes.compte.reserve).toBeGreaterThanOrEqual(1);
      expect((await api('get', '/workflows', tokenA)).status).toBe(403);
    });

    it('ajoute une étape sans retirer celles d’origine', async () => {
      const liste = await api('get', '/workflows', tokenManager);
      const ventes = liste.body.find(
        (w: { module: string }) => w.module === 'ventes',
      );
      const statuts = [...ventes.statuts, 'attente_notaire'];
      const transitions = {
        ...ventes.transitions,
        attente_notaire: ['annule'],
      };
      transitions.reserve = [...transitions.reserve, 'attente_notaire'];
      const ok = await api('put', '/workflows/ventes', tokenManager).send({
        statuts,
        transitions,
      });
      expect(ok.status).toBe(200);
      expect(ok.body.statuts).toContain('attente_notaire');
      expect(ok.body.transitions.reserve).toContain('attente_notaire');
    });

    it('refuse de retirer une étape ou un passage d’origine, ou une étape mal nommée', async () => {
      const liste = await api('get', '/workflows', tokenManager);
      const ventes = liste.body.find(
        (w: { module: string }) => w.module === 'ventes',
      );
      const sansSolde = ventes.statuts.filter((s: string) => s !== 'solde');
      expect(
        (
          await api('put', '/workflows/ventes', tokenManager).send({
            statuts: sansSolde,
            transitions: ventes.transitions,
          })
        ).status,
      ).toBe(400);
      const transitionsAmputees = {
        ...ventes.transitions,
        reserve: ventes.transitions.reserve.filter(
          (s: string) => s !== 'solde',
        ),
      };
      const amputee = await api('put', '/workflows/ventes', tokenManager).send({
        statuts: ventes.statuts,
        transitions: transitionsAmputees,
      });
      expect(amputee.status).toBe(400);
      expect(amputee.body.message).toContain('ne peut pas être retiré');
      expect(
        (
          await api('put', '/workflows/ventes', tokenManager).send({
            statuts: [...ventes.statuts, 'Étape Invalide'],
            transitions: ventes.transitions,
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await api('put', '/workflows/ventes', tokenManager).send({
            statuts: [...ventes.statuts, 'doublon', 'doublon'],
            transitions: ventes.transitions,
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await api('put', '/workflows/inconnu', tokenManager).send({
            statuts: [],
          })
        ).status,
      ).toBe(404);
    });

    it('le pipeline commercial s’enrichit d’une étape', async () => {
      const liste = await api('get', '/workflows', tokenManager);
      const crm = liste.body.find(
        (w: { module: string }) => w.module === 'crm',
      );
      const ok = await api('put', '/workflows/crm', tokenManager).send({
        statuts: [...crm.statuts, 'attente_financement'],
      });
      expect(ok.status).toBe(200);
      expect(ok.body.statuts).toContain('attente_financement');
    });

    it('la page Paramètres ne modifie plus ces clés à la main', async () => {
      const reponse = await api(
        'put',
        '/settings/ventes.statuts',
        tokenManager,
      ).send({
        value: ['en_cours'],
      });
      expect(reponse.status).toBe(400);
      expect(reponse.body.message).toContain('Parcours des dossiers');
    });

    it('sans permission, on ne modifie pas un parcours', async () => {
      expect(
        (
          await api('put', '/workflows/crm', tokenA).send({
            statuts: ['nouveau'],
          })
        ).status,
      ).toBe(403);
    });
  });
});
