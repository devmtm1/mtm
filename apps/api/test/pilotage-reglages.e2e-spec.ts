process.env.LOGIN_RATE_LIMIT_MAX = '100';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MailService } from '../src/common/mail/mail.service';
import { createE2eApp, type E2eContext } from './helpers/e2e-app';
import { describeE2e } from './helpers/e2e-database';

/** J3.2 — écran « Réglages du pilotage » : délais de blocage et envoi automatique. */
describeE2e('Pilotage : réglages (e2e)', () => {
  let app: INestApplication;
  let context: E2eContext;
  let tokenDirection = '';
  let tokenLecteur = '';
  let envoi: jest.SpyInstance;

  const PASSWORD = 'MotDePasse-Solide-2026';
  const api = (
    methode: 'get' | 'put' | 'post',
    chemin: string,
    token: string,
  ) =>
    request(app.getHttpServer())
      [methode](`/api${chemin}`)
      .set('Authorization', `Bearer ${token}`);

  const login = async (email: string) => {
    const r = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: PASSWORD });
    expect(r.status).toBe(201);
    return r.body.accessToken as string;
  };

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
    const { data } = context;
    const roleDirection = await data.seedRoleWithPermissions('dir_pilotage', [
      'rapports:consulter',
      'rapports:exporter',
      'rapports:administrer',
    ]);
    const roleLecteur = await data.seedRoleWithPermissions('lecteur', [
      'rapports:consulter',
    ]);
    const direction = await data.seedUser({
      email: 'direction@mtm.test',
      password: PASSWORD,
    });
    await data.linkUserRole(direction.id, roleDirection.id);
    const lecteur = await data.seedUser({
      email: 'lecteur@mtm.test',
      password: PASSWORD,
    });
    await data.linkUserRole(lecteur.id, roleLecteur.id);
    tokenDirection = await login('direction@mtm.test');
    tokenLecteur = await login('lecteur@mtm.test');
    envoi = jest.spyOn(app.get(MailService), 'send');
  });

  afterAll(async () => {
    await context.close();
  });

  beforeEach(() => {
    envoi.mockReset().mockResolvedValue(true);
  });

  it('réserve l’écran à ceux qui administrent le pilotage', async () => {
    expect((await api('get', '/pilotage/reglages', tokenLecteur)).status).toBe(
      403,
    );
    expect(
      (await api('put', '/pilotage/reglages/seuils', tokenLecteur).send({}))
        .status,
    ).toBe(403);
    expect(
      (await api('post', '/pilotage/reglages/envoi/test', tokenLecteur)).status,
    ).toBe(403);
  });

  it('présente les valeurs d’origine tant que rien n’est réglé', async () => {
    const r = await api('get', '/pilotage/reglages', tokenDirection);
    expect(r.status).toBe(200);
    expect(r.body.seuils).toEqual({
      vente: 15,
      mission: 10,
      chantier: 7,
      prospect: 14,
      tache: 3,
    });
    expect(r.body.envoi.actif).toBe(false);
    expect(r.body.rapports.length).toBe(7);
    expect(r.body.derniersEnvois).toEqual([]);
    expect(typeof r.body.messagerieConfiguree).toBe('boolean');
  });

  it('enregistre un délai sans toucher aux autres, et trace le changement', async () => {
    const r = await api(
      'put',
      '/pilotage/reglages/seuils',
      tokenDirection,
    ).send({ vente: 30 });
    expect(r.status).toBe(200);
    expect(r.body.seuils).toEqual({
      vente: 30,
      mission: 10,
      chantier: 7,
      prospect: 14,
      tache: 3,
    });
    const trace = await context.prisma.auditLog.findFirst({
      where: { action: 'setting.updated', entityType: 'SystemSetting' },
      orderBy: { createdAt: 'desc' },
    });
    expect(JSON.stringify(trace?.newValue)).toContain('pilotage.seuilsBlocage');
  });

  it('refuse un délai hors limites', async () => {
    expect(
      (
        await api('put', '/pilotage/reglages/seuils', tokenDirection).send({
          vente: 0,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await api('put', '/pilotage/reglages/seuils', tokenDirection).send({
          vente: 400,
        })
      ).status,
    ).toBe(400);
  });

  it('refuse d’activer l’envoi sans destinataire ni rapport', async () => {
    const r = await api('put', '/pilotage/reglages/envoi', tokenDirection).send(
      {
        actif: true,
        frequence: 'hebdomadaire',
        rapports: ['ventes_periode'],
        formats: ['pdf'],
        destinataires: [],
      },
    );
    expect(r.status).toBe(400);
  });

  it('enregistre l’envoi automatique et l’essai ne part qu’à la personne connectée', async () => {
    const enregistre = await api(
      'put',
      '/pilotage/reglages/envoi',
      tokenDirection,
    ).send({
      actif: true,
      frequence: 'mensuelle',
      rapports: ['rentabilite_activite'],
      formats: ['pdf'],
      destinataires: ['dg@mtm.test', 'autre@mtm.test'],
    });
    expect(enregistre.status).toBe(200);
    expect(enregistre.body.envoi).toMatchObject({
      actif: true,
      frequence: 'mensuelle',
      destinataires: ['dg@mtm.test', 'autre@mtm.test'],
    });

    const essai = await api(
      'post',
      '/pilotage/reglages/envoi/test',
      tokenDirection,
    );
    expect(essai.status).toBe(200);
    expect(essai.body).toEqual({ envoye: true });
    expect(envoi).toHaveBeenCalledTimes(1);
    const message = envoi.mock.calls[0][0] as {
      to: string;
      subject: string;
      attachments: unknown[];
    };
    expect(message.to).toBe('direction@mtm.test');
    expect(message.subject).toContain('[Essai]');
    expect(message.attachments).toHaveLength(1);
    // Un essai n'est pas l'envoi de la période.
    expect(
      await context.prisma.auditLog.count({
        where: { action: 'rapport.envoi_auto' },
      }),
    ).toBe(0);
  });

  it('signale quand la messagerie ne part pas', async () => {
    envoi.mockResolvedValue(false);
    const essai = await api(
      'post',
      '/pilotage/reglages/envoi/test',
      tokenDirection,
    );
    expect(essai.body).toEqual({
      envoye: false,
      raison: 'mail_indisponible',
    });
  });
});
