import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2eApp, type E2eContext } from './helpers/e2e-app';
import { describeE2e } from './helpers/e2e-database';

/**
 * Réponse de MTM à un message de contact : enregistrée, visible dans l'espace
 * du client (écran « Demandes »), et signalée dans sa cloche — sans jamais
 * apparaître chez quelqu'un d'autre.
 */
describeE2e('Réponse aux demandes et notifications du client (e2e)', () => {
  let app: INestApplication;
  let context: E2eContext;
  let jetonAgent: string;
  let jetonClient: string;
  let jetonAutreClient: string;
  let jetonSansDroit: string;

  const MOT_DE_PASSE = 'MotDePasse-Solide-2026';
  const EMAIL_CLIENT = 'awa.demande@exemple.sn';

  const connexion = async (email: string): Promise<string> => {
    const reponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: MOT_DE_PASSE });
    expect(reponse.status).toBe(201);
    return reponse.body.accessToken as string;
  };

  /** La notification est émise sans attendre : on laisse un instant à la base. */
  const notificationsDe = async (jeton: string, type: string) => {
    for (let essai = 0; essai < 20; essai += 1) {
      const reponse = await request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${jeton}`);
      const trouvees = (reponse.body.items as { type: string }[]).filter(
        (item) => item.type === type,
      );
      if (trouvees.length > 0) return { reponse, trouvees };
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return {
      reponse: await request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${jeton}`),
      trouvees: [] as { type: string }[],
    };
  };

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
    const { data, prisma } = context;

    const roleClient = await data.seedRoleWithPermissions('client', []);
    const roleAgent = await data.seedRoleWithPermissions('agent_contacts', [
      'contact:consulter',
      'contact:modifier',
    ]);

    const prospect = await prisma.prospect.create({
      data: {
        nom: 'Diop',
        prenom: 'Awa',
        email: EMAIL_CLIENT,
        statutPipeline: 'client',
      },
    });
    const client = await data.seedUser({
      email: EMAIL_CLIENT,
      password: MOT_DE_PASSE,
      firstName: 'Awa',
      lastName: 'Diop',
      clientProspectId: prospect.id,
    });
    await data.linkUserRole(client.id, roleClient.id);

    const autreProspect = await prisma.prospect.create({
      data: {
        nom: 'Ba',
        prenom: 'Moussa',
        email: 'moussa.autre@exemple.sn',
        statutPipeline: 'client',
      },
    });
    const autre = await data.seedUser({
      email: 'moussa.autre@exemple.sn',
      password: MOT_DE_PASSE,
      clientProspectId: autreProspect.id,
    });
    await data.linkUserRole(autre.id, roleClient.id);

    const agent = await data.seedUser({
      email: 'agent.contacts@mtm.sn',
      password: MOT_DE_PASSE,
    });
    await data.linkUserRole(agent.id, roleAgent.id);

    jetonAgent = await connexion('agent.contacts@mtm.sn');
    jetonClient = await connexion(EMAIL_CLIENT);
    jetonAutreClient = await connexion('moussa.autre@exemple.sn');
    jetonSansDroit = jetonClient;
  });

  afterAll(async () => {
    await context.close();
  });

  it('le client voit la réponse de MTM à son message et en est prévenu, lui seul', async () => {
    const depot = await request(app.getHttpServer()).post('/api/contact').send({
      nom: 'Awa Diop',
      email: EMAIL_CLIENT,
      sujet: 'Titre foncier',
      message: 'Pouvez-vous me confirmer la situation du titre ?',
    });
    expect(depot.status).toBe(201);

    const liste = await request(app.getHttpServer())
      .get('/api/contacts')
      .set('Authorization', `Bearer ${jetonAgent}`);
    expect(liste.status).toBe(200);
    const message = (liste.body as { id: string; email: string }[]).find(
      (item) => item.email === EMAIL_CLIENT,
    );
    expect(message).toBeDefined();

    // Avant la réponse : « en attente », aucune réponse.
    const avant = await request(app.getHttpServer())
      .get('/api/ventes/client/portal/demandes')
      .set('Authorization', `Bearer ${jetonClient}`);
    expect(avant.status).toBe(200);
    expect(avant.body.messages[0]).toMatchObject({
      traite: false,
      reponse: null,
    });

    const reponse = await request(app.getHttpServer())
      .post(`/api/contacts/${message!.id}/repondre`)
      .set('Authorization', `Bearer ${jetonAgent}`)
      .send({
        reponse:
          'Bonjour Awa, le titre est un titre foncier vérifié par nos équipes.',
      });
    expect(reponse.status).toBe(201);
    expect(reponse.body.contact).toMatchObject({ lu: true });
    expect(typeof reponse.body.emailEnvoye).toBe('boolean');

    // Après : la réponse accompagne le message dans l'espace du client.
    const apres = await request(app.getHttpServer())
      .get('/api/ventes/client/portal/demandes')
      .set('Authorization', `Bearer ${jetonClient}`);
    expect(apres.body.messages[0]).toMatchObject({
      traite: true,
      reponse:
        'Bonjour Awa, le titre est un titre foncier vérifié par nos équipes.',
    });
    expect(apres.body.messages[0].reponduLe).toEqual(expect.any(String));

    // La cloche du client le prévient, vers l'écran des demandes.
    const { reponse: cloche, trouvees } = await notificationsDe(
      jetonClient,
      'reponse_demande',
    );
    expect(trouvees).toHaveLength(1);
    expect(trouvees[0]).toMatchObject({
      lien: '/espace-client/demandes',
      niveau: 'info',
    });
    expect(cloche.body.nonLues).toBeGreaterThanOrEqual(1);

    // Un autre client ne reçoit rien, ni l'agent.
    const autre = await request(app.getHttpServer())
      .get('/api/notifications')
      .set('Authorization', `Bearer ${jetonAutreClient}`);
    expect(
      (autre.body.items as { type: string }[]).some(
        (item) => item.type === 'reponse_demande',
      ),
    ).toBe(false);
    const agent = await request(app.getHttpServer())
      .get('/api/notifications')
      .set('Authorization', `Bearer ${jetonAgent}`);
    expect(
      (agent.body.items as { type: string }[]).some(
        (item) => item.type === 'reponse_demande',
      ),
    ).toBe(false);
  });

  it('le client marque sa notification comme lue, sans pouvoir toucher à celle d’un autre', async () => {
    const { trouvees } = await notificationsDe(jetonClient, 'reponse_demande');
    const id = (trouvees[0] as unknown as { id: string }).id;

    const parUnAutre = await request(app.getHttpServer())
      .post(`/api/notifications/${id}/read`)
      .set('Authorization', `Bearer ${jetonAutreClient}`);
    expect(parUnAutre.body).toEqual({ marquees: 0 });

    const parLeClient = await request(app.getHttpServer())
      .post(`/api/notifications/${id}/read`)
      .set('Authorization', `Bearer ${jetonClient}`);
    expect(parLeClient.body).toEqual({ marquees: 1 });

    const apres = await request(app.getHttpServer())
      .get('/api/notifications?nonLues=true')
      .set('Authorization', `Bearer ${jetonClient}`);
    expect(apres.body.nonLues).toBe(0);
  });

  it('seul le personnel autorisé peut répondre, et pas à vide', async () => {
    const liste = await request(app.getHttpServer())
      .get('/api/contacts')
      .set('Authorization', `Bearer ${jetonAgent}`);
    const id = (liste.body as { id: string }[])[0].id;

    const interdit = await request(app.getHttpServer())
      .post(`/api/contacts/${id}/repondre`)
      .set('Authorization', `Bearer ${jetonSansDroit}`)
      .send({ reponse: 'Je réponds sans en avoir le droit.' });
    expect(interdit.status).toBe(403);

    const vide = await request(app.getHttpServer())
      .post(`/api/contacts/${id}/repondre`)
      .set('Authorization', `Bearer ${jetonAgent}`)
      .send({ reponse: ' ' });
    expect(vide.status).toBe(400);

    const inconnu = await request(app.getHttpServer())
      .post('/api/contacts/00000000-0000-4000-8000-000000000000/repondre')
      .set('Authorization', `Bearer ${jetonAgent}`)
      .send({ reponse: 'Réponse à un message qui n’existe pas.' });
    expect(inconnu.status).toBe(404);
  });
});
