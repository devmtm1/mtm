// Plusieurs comptes se connectent à la suite : on relève la limite de connexions.
process.env.LOGIN_RATE_LIMIT_MAX = '100';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2eApp, type E2eContext } from './helpers/e2e-app';
import { createStockageDeTest } from './helpers/cloudinary-mock';
import { describeE2e } from './helpers/e2e-database';
import { ProtocolesRappelsService } from '../src/modules/protocoles/protocoles-rappels.service';

/**
 * Suivi des protocoles et des signatures : la secrétaire dépose et fait avancer, la Direction valide, et un paiement reçu sans
 * protocole signé déclenche l'alerte. Un protocole envoyé n'est jamais « signé ».
 */
describeE2e('Protocoles et signatures (e2e)', () => {
  let app: INestApplication;
  let context: E2eContext;
  let tokenSecretaire: string;
  let tokenDirection: string;
  let tokenSansDroit: string;
  let dossierId: string;

  const PASSWORD = 'MotDePasse-Solide-2026';
  const PDF = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n',
  );

  const login = async (email: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: PASSWORD });
    expect(response.status).toBe(201);
    return response.body.accessToken as string;
  };
  const get = (token: string, chemin: string) =>
    request(app.getHttpServer())
      .get(`/api/protocoles${chemin}`)
      .set('Authorization', `Bearer ${token}`);
  const statut = (token: string, id: string, corps: Record<string, unknown>) =>
    request(app.getHttpServer())
      .patch(`/api/protocoles/${id}/statut`)
      .set('Authorization', `Bearer ${token}`)
      .send(corps);
  const deposer = (token: string, id: string, role: 'prepare' | 'signe') =>
    request(app.getHttpServer())
      .post(`/api/protocoles/${id}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .field('role', role)
      .attach('file', PDF, {
        filename: `${role}.pdf`,
        contentType: 'application/pdf',
      });

  beforeAll(async () => {
    context = await createE2eApp({ cloudinary: createStockageDeTest() });
    app = context.app;
    const { data, prisma } = context;

    const droitsSecretaire = [
      'ventes:consulter',
      'ventes:creer',
      'ventes:modifier',
      'protocoles:consulter',
      'protocoles:creer',
      'protocoles:modifier',
    ];
    const secretaire = await data.seedRoleWithPermissions(
      'secretaire',
      droitsSecretaire,
    );
    // Un rôle créé dans le back-office : « direction » est un rôle sensible qui exigerait la double authentification.
    const direction = await data.seedRoleWithPermissions(
      'controle_protocoles',
      [...droitsSecretaire, 'protocoles:valider'],
    );
    const sansDroit = await data.seedRoleWithPermissions('stagiaire', [
      'contact:consulter',
    ]);

    const ids: Record<string, string> = {};
    for (const [email, role] of [
      ['secretaire@mtm.sn', secretaire],
      ['direction@mtm.sn', direction],
      ['stagiaire@mtm.sn', sansDroit],
    ] as const) {
      const user = await data.seedUser({ email, password: PASSWORD });
      await data.linkUserRole(user.id, role.id);
      ids[email] = user.id;
    }

    const prospect = await prisma.prospect.create({
      data: { nom: 'Diop', prenom: 'Awa', telephone: '771234567' },
    });
    const dossier = await prisma.dossierVente.create({
      data: {
        prospectId: prospect.id,
        referenceInterne: 'VTE-E2E-1',
        prixVente: 10_000_000,
        statut: 'reserve',
      },
    });
    dossierId = dossier.id;
    await prisma.paiement.create({
      data: {
        dossierVenteId: dossierId,
        montant: 2_000_000,
        mode: 'virement',
        statut: 'valide',
      },
    });

    tokenSecretaire = await login('secretaire@mtm.sn');
    tokenDirection = await login('direction@mtm.sn');
    tokenSansDroit = await login('stagiaire@mtm.sn');
  });

  afterAll(async () => {
    await context.close();
  });

  it('refuse l’accès à qui n’a pas la permission de consulter', async () => {
    expect((await get(tokenSansDroit, '')).status).toBe(403);
    expect((await get(tokenSansDroit, '/alertes')).status).toBe(403);
  });

  it('signale « paiement reçu – signature manquante » tant qu’aucun protocole n’est signé', async () => {
    const alertes = await get(tokenDirection, '/alertes');
    expect(alertes.status).toBe(200);
    expect(alertes.body).toHaveLength(1);
    expect(alertes.body[0]).toMatchObject({
      reference: 'VTE-E2E-1',
      client: 'Awa Diop',
      montantEncaisse: 2_000_000,
      soldeRestant: 8_000_000,
      protocoleActuel: 'Aucun protocole',
    });

    const tableau = await get(tokenDirection, '/tableau');
    expect(tableau.body.paiements).toEqual({
      avecSignature: 0,
      sansSignature: 1,
    });
  });

  it('suit un protocole de sa création à sa validation, sans jamais le dire signé trop tôt', async () => {
    const creation = await request(app.getHttpServer())
      .post('/api/protocoles')
      .set('Authorization', `Bearer ${tokenSecretaire}`)
      .send({ dossierVenteId: dossierId, titre: 'Protocole lot 12' });
    expect(creation.status).toBe(201);
    expect(creation.body.statut).toBe('a_preparer');
    const id = creation.body.id as string;

    // Préparé : exige le document.
    expect(
      (await statut(tokenSecretaire, id, { statut: 'prepare_a_verifier' })).body
        .message,
    ).toMatch(/document préparé/);
    expect((await deposer(tokenSecretaire, id, 'prepare')).status).toBe(201);
    expect(
      (await statut(tokenSecretaire, id, { statut: 'prepare_a_verifier' }))
        .status,
    ).toBe(200);

    // Envoyé : exige la date et le moyen.
    expect(
      (await statut(tokenSecretaire, id, { statut: 'envoye' })).status,
    ).toBe(400);
    const envoye = await statut(tokenSecretaire, id, {
      statut: 'envoye',
      dateEnvoi: '2026-11-10',
      moyenEnvoi: 'whatsapp',
    });
    expect(envoye.status).toBe(200);
    expect(envoye.body.moyenEnvoi).toBe('whatsapp');

    // Envoyé n'est pas signé : le paiement reste signalé.
    expect((await get(tokenDirection, '/alertes')).body).toHaveLength(1);

    // Signé : exige la copie signée ET sa date de réception.
    expect(
      (
        await statut(tokenSecretaire, id, {
          statut: 'signe_client',
          dateReceptionSignee: '2026-11-15',
        })
      ).body.message,
    ).toMatch(/copie signée/);
    expect((await deposer(tokenSecretaire, id, 'signe')).status).toBe(201);
    expect(
      (await statut(tokenSecretaire, id, { statut: 'signe_client' })).body
        .message,
    ).toMatch(/date de réception/);
    const signe = await statut(tokenSecretaire, id, {
      statut: 'signe_client',
      dateReceptionSignee: '2026-11-15',
    });
    expect(signe.status).toBe(200);
    expect(signe.body.libelleStatut).toBe('Signé par le client');

    // Signé : l'alerte disparaît.
    expect((await get(tokenDirection, '/alertes')).body).toHaveLength(0);
    expect((await get(tokenDirection, '/tableau')).body.paiements).toEqual({
      avecSignature: 1,
      sansSignature: 0,
    });

    // La validation finale revient à la Direction.
    expect(
      (await statut(tokenSecretaire, id, { statut: 'a_valider_direction' }))
        .status,
    ).toBe(200);
    expect(
      (await statut(tokenSecretaire, id, { statut: 'valide' })).status,
    ).toBe(400);
    const valide = await statut(tokenDirection, id, { statut: 'valide' });
    expect(valide.status).toBe(200);
    expect(valide.body.libelleStatut).toBe('Validé / clôturé');

    // L'historique garde chaque étape et son auteur.
    const detail = await get(tokenDirection, `/${id}`);
    expect(
      detail.body.historique.map((ligne: { vers: string }) => ligne.vers),
    ).toEqual([
      'valide',
      'a_valider_direction',
      'signe_client',
      'envoye',
      'prepare_a_verifier',
      'a_preparer',
    ]);
    expect(detail.body.documentSigne).not.toBeNull();

    // Un protocole clos est définitif.
    expect(
      (
        await statut(tokenDirection, id, {
          statut: 'a_corriger',
          motif: 'Erreur',
        })
      ).status,
    ).toBe(400);
    expect((await deposer(tokenSecretaire, id, 'signe')).status).toBe(409);
  });

  it('ne laisse pas supprimer une pièce rattachée à un protocole', async () => {
    const detail = (await get(tokenDirection, '?dossierVenteId=' + dossierId))
      .body.items[0] as { documentSigne: { id: string } };
    const suppression = await request(app.getHttpServer())
      .delete(`/api/ventes/${dossierId}/documents/${detail.documentSigne.id}`)
      .set('Authorization', `Bearer ${tokenDirection}`);
    expect(suppression.status).toBe(403);
  });

  it('exige un motif pour annuler ou demander une correction', async () => {
    const creation = await request(app.getHttpServer())
      .post('/api/protocoles')
      .set('Authorization', `Bearer ${tokenSecretaire}`)
      .send({ dossierVenteId: dossierId });
    const id = creation.body.id as string;
    expect(
      (await statut(tokenSecretaire, id, { statut: 'annule' })).body.message,
    ).toMatch(/motif/);
    expect(
      (
        await statut(tokenSecretaire, id, {
          statut: 'annule',
          motif: 'Doublon',
        })
      ).status,
    ).toBe(200);
  });

  it('retrouve les protocoles par statut et par recherche', async () => {
    const valides = await get(tokenDirection, '?statut=valide');
    expect(valides.body.total).toBe(1);
    const recherche = await get(tokenDirection, '?q=diop');
    expect(recherche.body.total).toBe(2);
    const aucun = await get(tokenDirection, '?q=inconnu');
    expect(aucun.body.total).toBe(0);
  });

  it('trace chaque consultation d’un protocole dans le journal d’audit', async () => {
    const liste = await get(tokenDirection, '');
    const id = liste.body.items[0].id as string;
    await get(tokenDirection, `/${id}`);
    const traces = await context.prisma.auditLog.count({
      where: { action: 'protocole.viewed', entityId: id },
    });
    expect(traces).toBeGreaterThanOrEqual(1);
  });

  it('propose les collaborateurs responsables des dossiers suivis, et filtre par collaborateur', async () => {
    const { prisma } = context;
    const responsable = await prisma.user.findFirstOrThrow({
      where: { email: 'secretaire@mtm.sn' },
    });
    await prisma.dossierVente.update({
      where: { id: dossierId },
      data: { commercialResponsableId: responsable.id },
    });
    const responsables = await get(tokenDirection, '/responsables');
    expect(responsables.status).toBe(200);
    expect(responsables.body.map((r: { id: string }) => r.id)).toContain(
      responsable.id,
    );

    expect(
      (await get(tokenDirection, `?responsableId=${responsable.id}`)).body
        .total,
    ).toBeGreaterThan(0);
    expect(
      (
        await get(
          tokenDirection,
          '?responsableId=00000000-0000-4000-8000-000000000000',
        )
      ).body.total,
    ).toBe(0);
  });

  it('filtre par période de création du dossier', async () => {
    expect((await get(tokenDirection, '?depuis=2999-01-01')).body.total).toBe(
      0,
    );
    expect(
      (await get(tokenDirection, '?depuis=2000-01-01')).body.total,
    ).toBeGreaterThan(0);
  });

  it('l’export exige le droit « exporter » : la Direction du test ne l’a pas', async () => {
    const reponse = await request(app.getHttpServer())
      .post('/api/exports/tableau')
      .set('Authorization', `Bearer ${tokenDirection}`)
      .send({
        module: 'protocoles',
        titre: 'Protocoles',
        format: 'xlsx',
        justification: 'Contrôle',
        colonnes: [{ cle: 'c0', libelle: 'Dossier', type: 'texte' }],
        lignes: [{ c0: 'VTE-E2E-1' }],
      });
    expect(reponse.status).toBe(403);
  });

  it('rappelle une signature en attente depuis plus longtemps que le délai, une seule fois par période', async () => {
    const { prisma } = context;
    const dossier = await prisma.dossierVente.findFirstOrThrow({
      where: { referenceInterne: 'VTE-E2E-1' },
    });
    const envoye = await prisma.protocoleDossier.create({
      data: {
        dossierVenteId: dossier.id,
        statut: 'en_attente_signature',
        titre: 'Protocole en retard',
        dateEnvoi: new Date(Date.now() - 12 * 86_400_000),
      },
    });
    const rappels = app.get(ProtocolesRappelsService);
    expect(await rappels.rappeler()).toBeGreaterThanOrEqual(1);
    const apres = await prisma.notification.count({
      where: { type: 'protocole_rappel', entityId: envoye.id },
    });
    expect(apres).toBeGreaterThanOrEqual(1);
    // Relancer la tâche le même jour n'envoie rien de plus.
    await rappels.rappeler();
    expect(
      await prisma.notification.count({
        where: { type: 'protocole_rappel', entityId: envoye.id },
      }),
    ).toBe(apres);
    // Le protocole apparaît « en retard » dans le tableau de bord.
    const tableau = await get(tokenDirection, '/tableau');
    expect(tableau.body.protocoles.enRetard).toBeGreaterThanOrEqual(1);
  });

  it('n’alerte pas pour un dossier ouvert avant le début du suivi, sauf si la Direction le décide', async () => {
    const { prisma } = context;
    const prospect = await prisma.prospect.create({
      data: { nom: 'Ancien', prenom: 'Client', telephone: '770000000' },
    });
    const ancien = await prisma.dossierVente.create({
      data: {
        prospectId: prospect.id,
        referenceInterne: 'VTE-ANCIEN',
        prixVente: 5_000_000,
        statut: 'reserve',
        createdAt: new Date('2020-01-01T00:00:00Z'),
      },
    });
    await prisma.paiement.create({
      data: {
        dossierVenteId: ancien.id,
        montant: 1_000_000,
        mode: 'virement',
        statut: 'valide',
      },
    });
    const references = async () =>
      (
        (await get(tokenDirection, '/alertes')).body as { reference: string }[]
      ).map((alerte) => alerte.reference);

    // En production la migration fixe ce réglage au jour de la mise en service (vérifié à part, sur une base neuve) ;
    // ici le harnais vide les tables, on le pose donc comme la migration le ferait.
    const reglage = await prisma.systemSetting.upsert({
      where: { key: 'protocoles.suiviDepuis' },
      update: { value: '2025-01-01' },
      create: { key: 'protocoles.suiviDepuis', value: '2025-01-01' },
    });
    expect(await references()).not.toContain('VTE-ANCIEN');
    expect((await get(tokenDirection, '/tableau')).body.suiviDepuis).toBe(
      reglage.value,
    );

    // Vider le réglage : tous les dossiers sont de nouveau suivis.
    await prisma.systemSetting.update({
      where: { key: 'protocoles.suiviDepuis' },
      data: { value: '' },
    });
    expect(await references()).toContain('VTE-ANCIEN');
    await prisma.systemSetting.update({
      where: { key: 'protocoles.suiviDepuis' },
      data: { value: reglage.value as string },
    });
  });

  it('le client voit l’étape simple de son protocole, jamais les statuts internes ni celui d’un autre client', async () => {
    const { prisma, data } = context;
    const roleClient = await data.seedRoleWithPermissions('client', []);
    const prospect = await prisma.prospect.findFirstOrThrow({
      where: { nom: 'Diop' },
    });
    const client = await data.seedUser({
      email: 'awa.diop@client.test',
      password: PASSWORD,
      firstName: 'Awa',
      clientProspectId: prospect.id,
    });
    await data.linkUserRole(client.id, roleClient.id);
    const autre = await prisma.prospect.create({
      data: { nom: 'Autre', prenom: 'Client', telephone: '771111111' },
    });
    const autreClient = await data.seedUser({
      email: 'autre@client.test',
      password: PASSWORD,
      firstName: 'Autre',
      clientProspectId: autre.id,
    });
    await data.linkUserRole(autreClient.id, roleClient.id);

    const dossier = await prisma.dossierVente.findFirstOrThrow({
      where: { referenceInterne: 'VTE-E2E-1' },
    });
    await prisma.protocoleDossier.create({
      data: {
        dossierVenteId: dossier.id,
        statut: 'a_corriger',
        titre: 'À corriger en interne',
        motif: 'MOTIF INTERNE CONFIDENTIEL',
      },
    });
    await prisma.protocoleDossier.create({
      data: {
        dossierVenteId: dossier.id,
        statut: 'annule',
        titre: 'Annulé',
        motif: 'Annulé par erreur',
      },
    });

    const portail = async (email: string) => {
      const jeton = await login(email);
      return request(app.getHttpServer())
        .get('/api/ventes/client/portal')
        .set('Authorization', `Bearer ${jeton}`);
    };
    const reponse = await portail('awa.diop@client.test');
    expect(reponse.status).toBe(200);
    const protocoles = reponse.body[0].protocoles as {
      etape: string;
      libelle: string;
      titre: string;
    }[];
    expect(protocoles.length).toBeGreaterThan(0);
    // Un protocole annulé n'est pas montré ; un protocole « à corriger » est « en préparation ».
    expect(protocoles.map((p) => p.titre)).not.toContain('Annulé');
    expect(
      protocoles.find((p) => p.titre === 'À corriger en interne')?.etape,
    ).toBe('en_preparation');
    const texte = JSON.stringify(reponse.body);
    expect(texte).not.toContain('MOTIF INTERNE CONFIDENTIEL');
    expect(texte).not.toMatch(/a_corriger|a_valider_direction|moyenEnvoi/);

    // Un autre client ne voit rien de ce dossier.
    const vide = await portail('autre@client.test');
    expect(vide.status).toBe(200);
    expect(JSON.stringify(vide.body)).not.toContain('VTE-E2E-1');
  });

  it('le droit « consulter les protocoles » ouvre les dossiers, pas la supervision commerciale', async () => {
    const appel = (chemin: string) =>
      request(app.getHttpServer())
        .get(`/api${chemin}`)
        .set('Authorization', `Bearer ${tokenSecretaire}`);

    // Elle ouvre bien tous les dossiers de vente (c'est son travail)…
    const dossiers = await appel('/ventes');
    expect(dossiers.status).toBe(200);
    expect(JSON.stringify(dossiers.body)).toContain('VTE-E2E-1');

    // …mais pas la performance d'un autre commercial ni les demandes de réservation du site.
    const autreCommercial = '3f2c7d9e-6b1a-4c55-9a0e-1d2e3f4a5b6c';
    expect(
      (await appel(`/ventes/dashboard/commercial/${autreCommercial}`)).status,
    ).toBe(403);
    const demandes = await appel('/ventes/reservation-requests');
    expect(demandes.status).toBe(200);
    expect(demandes.body).toEqual([]);
  });

  it('prévient le client dans son espace dès que son protocole lui est envoyé (une seule fois)', async () => {
    const { prisma } = context;
    const client = await prisma.user.findUniqueOrThrow({
      where: { email: 'awa.diop@client.test' },
    });
    const creation = await request(app.getHttpServer())
      .post('/api/protocoles')
      .set('Authorization', `Bearer ${tokenSecretaire}`)
      .send({ dossierVenteId: dossierId, titre: 'Protocole à signer par Awa' });
    const id = creation.body.id as string;
    expect((await deposer(tokenSecretaire, id, 'prepare')).status).toBe(201);
    expect(
      (await statut(tokenSecretaire, id, { statut: 'prepare_a_verifier' }))
        .status,
    ).toBe(200);
    // Préparé : le client n'est pas encore prévenu.
    expect(
      await prisma.notification.count({
        where: { userId: client.id, type: 'protocole_a_signer', entityId: id },
      }),
    ).toBe(0);
    expect(
      (
        await statut(tokenSecretaire, id, {
          statut: 'envoye',
          dateEnvoi: '2026-11-20',
          moyenEnvoi: 'whatsapp',
        })
      ).status,
    ).toBe(200);
    const notifications = await prisma.notification.findMany({
      where: { userId: client.id, type: 'protocole_a_signer', entityId: id },
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      titre: 'Votre protocole est prêt à signer',
      lien: '/espace-client/dossiers',
    });
    // Un autre client n'est pas prévenu.
    const autre = await prisma.user.findUniqueOrThrow({
      where: { email: 'autre@client.test' },
    });
    expect(
      await prisma.notification.count({
        where: { userId: autre.id, type: 'protocole_a_signer' },
      }),
    ).toBe(0);
  });

  describe('formats de fichier acceptés', () => {
    // De vrais en-têtes de fichier : le serveur contrôle le contenu, pas seulement l'extension.
    const FORMATS: [string, string, Buffer][] = [
      ['PDF', 'application/pdf', PDF],
      [
        'JPEG (photo ou scan)',
        'image/jpeg',
        Buffer.from([
          0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1,
        ]),
      ],
      [
        'PNG',
        'image/png',
        Buffer.from([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49,
          0x48, 0x44, 0x52,
        ]),
      ],
      [
        'WebP',
        'image/webp',
        Buffer.concat([
          Buffer.from('RIFF'),
          Buffer.from([0x1a, 0, 0, 0]),
          Buffer.from('WEBPVP8 '),
        ]),
      ],
      [
        'Word (.docx)',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0, 0, 0]),
      ],
    ];

    const nouveauProtocole = async (titre: string) => {
      const creation = await request(app.getHttpServer())
        .post('/api/protocoles')
        .set('Authorization', `Bearer ${tokenSecretaire}`)
        .send({ dossierVenteId: dossierId, titre });
      expect(creation.status).toBe(201);
      return creation.body.id as string;
    };
    const deposerFichier = (
      id: string,
      role: 'prepare' | 'signe',
      contenu: Buffer,
      nom: string,
      type: string,
    ) =>
      request(app.getHttpServer())
        .post(`/api/protocoles/${id}/documents`)
        .set('Authorization', `Bearer ${tokenSecretaire}`)
        .field('role', role)
        .attach('file', contenu, { filename: nom, contentType: type });

    it.each(FORMATS)(
      'accepte le dépôt du protocole préparé en %s',
      async (_nom, type, contenu) => {
        const id = await nouveauProtocole(`Format ${type}`);
        const reponse = await deposerFichier(
          id,
          'prepare',
          contenu,
          'protocole',
          type,
        );
        expect(reponse.status).toBe(201);
        expect(reponse.body.documentPrepare).toBeTruthy();
      },
    );

    it('accepte une copie signée prise en photo (JPEG) : le cas le plus courant sur le terrain', async () => {
      const id = await nouveauProtocole('Copie signée en photo');
      const [, , jpeg] = FORMATS[1];
      expect(
        (
          await deposerFichier(
            id,
            'prepare',
            PDF,
            'protocole.pdf',
            'application/pdf',
          )
        ).status,
      ).toBe(201);
      for (const etape of [
        { statut: 'prepare_a_verifier' },
        { statut: 'envoye', dateEnvoi: '2026-11-10', moyenEnvoi: 'whatsapp' },
      ]) {
        expect((await statut(tokenSecretaire, id, etape)).status).toBe(200);
      }
      // Sans copie signée, « signé » reste refusé…
      expect(
        (
          await statut(tokenSecretaire, id, {
            statut: 'signe_client',
            dateReceptionSignee: '2026-11-12',
          })
        ).status,
      ).toBe(400);
      // …avec la photo de la copie signée, il passe.
      expect(
        (await deposerFichier(id, 'signe', jpeg, 'signe.jpg', 'image/jpeg'))
          .status,
      ).toBe(201);
      const signe = await statut(tokenSecretaire, id, {
        statut: 'signe_client',
        dateReceptionSignee: '2026-11-12',
      });
      expect(signe.status).toBe(200);
      expect(signe.body.statut).toBe('signe_client');
    });

    it('refuse un fichier dont le contenu ne correspond pas à son type, et les types inconnus', async () => {
      const id = await nouveauProtocole('Fichiers refusés');
      const fauxJpeg = await deposerFichier(
        id,
        'prepare',
        Buffer.from('ceci est du texte'),
        'faux.jpg',
        'image/jpeg',
      );
      expect(fauxJpeg.status).toBe(400);
      const executable = await deposerFichier(
        id,
        'prepare',
        Buffer.from('MZ '),
        'virus.exe',
        'application/x-msdownload',
      );
      expect(executable.status).toBe(400);
      const texte = await deposerFichier(
        id,
        'prepare',
        Buffer.from('bonjour'),
        'note.txt',
        'text/plain',
      );
      expect(texte.status).toBe(400);
    });
  });

  describe('autres dossiers : bail locatif et chantier', () => {
    let bailId: string;
    let chantierId: string;

    beforeAll(async () => {
      const { data, prisma } = context;
      const proprietaire = await data.seedProprietaire();
      const bien = await prisma.bienLocatif.create({
        data: {
          referenceInterne: 'BL-PROTO-1',
          proprietaireId: proprietaire.id,
          type: 'appartement',
          adresse: 'Rue des Almadies',
        },
      });
      const locataire = await prisma.locataire.create({
        data: { firstName: 'Moussa', lastName: 'Ndiaye', phone: '770000000' },
      });
      bailId = (
        await prisma.bailLocatif.create({
          data: {
            referenceInterne: 'B-PROTO-1',
            bienLocatifId: bien.id,
            locataireId: locataire.id,
            loyerMensuel: 150_000,
            dateDebut: new Date('2026-01-01T00:00:00Z'),
          },
        })
      ).id;
      const client = await prisma.prospect.create({
        data: { nom: 'Fall', prenom: 'Ibou', telephone: '779999999' },
      });
      chantierId = (
        await prisma.projetConstruction.create({
          data: {
            referenceInterne: 'CH-PROTO-1',
            clientId: client.id,
            intitule: 'Villa Fall',
            typeProjet: 'villa',
          },
        })
      ).id;
    });

    const creer = (corps: Record<string, unknown>) =>
      request(app.getHttpServer())
        .post('/api/protocoles')
        .set('Authorization', `Bearer ${tokenSecretaire}`)
        .send(corps);

    it('exige un seul dossier : ni aucun, ni plusieurs', async () => {
      expect((await creer({ titre: 'Sans dossier' })).status).toBe(400);
      expect(
        (await creer({ dossierVenteId: dossierId, bailLocatifId: bailId }))
          .status,
      ).toBe(400);
    });

    it('suit un protocole de bail jusqu’à la signature, avec sa copie signée', async () => {
      const cree = await creer({
        bailLocatifId: bailId,
        titre: 'Protocole de bail',
      });
      expect(cree.status).toBe(201);
      expect(cree.body.dossier).toMatchObject({
        typeDossier: 'bail',
        reference: 'B-PROTO-1',
        client: 'Moussa Ndiaye',
        montantConvenu: null,
      });
      const id = cree.body.id as string;
      // Sans pièce préparée, on ne peut pas faire vérifier le protocole.
      expect(
        (await statut(tokenSecretaire, id, { statut: 'prepare_a_verifier' }))
          .status,
      ).toBe(400);
      const prepare = await deposer(tokenSecretaire, id, 'prepare');
      expect(prepare.status).toBe(201);
      expect(prepare.body.documentPrepare.version).toBe(1);
      for (const etape of [
        { statut: 'prepare_a_verifier' },
        { statut: 'envoye', dateEnvoi: '2026-11-10', moyenEnvoi: 'whatsapp' },
      ]) {
        expect((await statut(tokenSecretaire, id, etape)).status).toBe(200);
      }
      // Envoyé n’est pas signé : la copie signée est exigée.
      expect(
        (
          await statut(tokenSecretaire, id, {
            statut: 'signe_client',
            dateReceptionSignee: '2026-11-12',
          })
        ).status,
      ).toBe(400);
      expect((await deposer(tokenSecretaire, id, 'signe')).status).toBe(201);
      const signe = await statut(tokenSecretaire, id, {
        statut: 'signe_client',
        dateReceptionSignee: '2026-11-12',
      });
      expect(signe.status).toBe(200);
      expect(signe.body.documentSigne).toBeTruthy();
    });

    it('suit un protocole de chantier et le retrouve par type de dossier', async () => {
      const cree = await creer({
        projetConstructionId: chantierId,
        titre: 'Protocole chantier',
      });
      expect(cree.status).toBe(201);
      expect(cree.body.dossier).toMatchObject({
        typeDossier: 'chantier',
        reference: 'CH-PROTO-1',
        bien: 'Villa Fall',
      });
      const chantiers = await get(tokenSecretaire, '?typeDossier=chantier');
      expect(chantiers.body.items.map((p: { id: string }) => p.id)).toContain(
        cree.body.id,
      );
      expect(
        chantiers.body.items.every(
          (p: { dossier: { typeDossier: string } }) =>
            p.dossier.typeDossier === 'chantier',
        ),
      ).toBe(true);
      const parClient = await get(tokenSecretaire, '?q=Fall');
      expect(parClient.body.items.map((p: { id: string }) => p.id)).toContain(
        cree.body.id,
      );
      const parBail = await get(tokenSecretaire, `?bailLocatifId=${bailId}`);
      expect(
        parBail.body.items.every(
          (p: { dossier: { typeDossier: string } }) =>
            p.dossier.typeDossier === 'bail',
        ),
      ).toBe(true);
    });

    it('propose les baux et les chantiers à rattacher, avec recherche', async () => {
      const baux = await get(
        tokenSecretaire,
        '/dossiers-possibles?type=bail&q=Ndiaye',
      );
      expect(baux.status).toBe(200);
      expect(baux.body).toEqual([
        expect.objectContaining({
          id: bailId,
          libelle: expect.stringContaining('B-PROTO-1'),
        }),
      ]);
      const chantiers = await get(
        tokenSecretaire,
        '/dossiers-possibles?type=chantier',
      );
      expect(chantiers.body.map((c: { id: string }) => c.id)).toContain(
        chantierId,
      );
      expect(
        (await get(tokenSecretaire, '/dossiers-possibles?type=vente')).status,
      ).toBe(400);
      expect(
        (await get(tokenSansDroit, '/dossiers-possibles?type=bail')).status,
      ).toBe(403);
    });

    it('refuse un bail ou un chantier inconnu', async () => {
      const inconnu = '00000000-0000-4000-8000-000000000000';
      expect((await creer({ bailLocatifId: inconnu })).status).toBe(404);
      expect((await creer({ projetConstructionId: inconnu })).status).toBe(404);
    });
  });

  describe('acceptation en ligne par le client', () => {
    let tokenClient: string;
    let tokenAutreClient: string;
    let protocoleId: string;

    const reglage = (actif: boolean) =>
      context.prisma.systemSetting.upsert({
        where: { key: 'protocoles.signatureEnLigne' },
        update: { value: actif },
        create: { key: 'protocoles.signatureEnLigne', value: actif },
      });
    const accepter = (
      token: string,
      id: string,
      corps: Record<string, unknown>,
    ) =>
      request(app.getHttpServer())
        .post(`/api/protocoles/client/${id}/accepter`)
        .set('Authorization', `Bearer ${token}`)
        .set('User-Agent', 'Navigateur-de-test')
        .send(corps);
    const portail = async () =>
      (
        await request(app.getHttpServer())
          .get('/api/ventes/client/portal')
          .set('Authorization', `Bearer ${tokenClient}`)
      ).body[0].protocoles as {
        id: string;
        etape: string;
        peutAccepterEnLigne: boolean;
        documentUrl: string | null;
      }[];

    beforeAll(async () => {
      const { prisma, data } = context;
      const roleClient = await data.seedRoleWithPermissions(
        'client_en_ligne',
        [],
      );
      const prospect = await prisma.prospect.create({
        data: { nom: 'Ba', prenom: 'Fatou', telephone: '772222222' },
      });
      const dossier = await prisma.dossierVente.create({
        data: {
          prospectId: prospect.id,
          referenceInterne: 'VTE-LIGNE-1',
          prixVente: 5_000_000,
          statut: 'reserve',
        },
      });
      const client = await data.seedUser({
        email: 'fatou.ba@client.test',
        password: PASSWORD,
        firstName: 'Fatou',
        clientProspectId: prospect.id,
      });
      await data.linkUserRole(client.id, roleClient.id);
      const autre = await prisma.prospect.create({
        data: { nom: 'Sow', prenom: 'Omar', telephone: '773333333' },
      });
      const autreUser = await data.seedUser({
        email: 'omar.sow@client.test',
        password: PASSWORD,
        firstName: 'Omar',
        clientProspectId: autre.id,
      });
      await data.linkUserRole(autreUser.id, roleClient.id);
      tokenClient = await login('fatou.ba@client.test');
      tokenAutreClient = await login('omar.sow@client.test');

      const cree = await request(app.getHttpServer())
        .post('/api/protocoles')
        .set('Authorization', `Bearer ${tokenSecretaire}`)
        .send({
          dossierVenteId: dossier.id,
          titre: 'Protocole à accepter en ligne',
        });
      protocoleId = cree.body.id as string;
    });

    it('n’offre pas l’acceptation tant que la signature en ligne n’est pas activée', async () => {
      await deposer(tokenSecretaire, protocoleId, 'prepare');
      await statut(tokenSecretaire, protocoleId, {
        statut: 'prepare_a_verifier',
      });
      await statut(tokenSecretaire, protocoleId, {
        statut: 'envoye',
        dateEnvoi: '2026-11-10',
        moyenEnvoi: 'email',
      });
      const protocole = (await portail()).find((p) => p.id === protocoleId);
      expect(protocole?.etape).toBe('a_signer');
      expect(protocole?.peutAccepterEnLigne).toBe(false);
      expect(protocole?.documentUrl).toBeTruthy();
      const refus = await accepter(tokenClient, protocoleId, {
        nom: 'Fatou Ba',
        accepte: true,
      });
      expect(refus.status).toBe(403);
    });

    it('enregistre l’acceptation avec sa preuve et passe le protocole « signé par le client »', async () => {
      await reglage(true);
      expect(
        (await portail()).find((p) => p.id === protocoleId)
          ?.peutAccepterEnLigne,
      ).toBe(true);
      // Le nom est obligatoire, et la case « j’ai lu et j’accepte » aussi.
      expect(
        (await accepter(tokenClient, protocoleId, { nom: 'F', accepte: true }))
          .status,
      ).toBe(400);
      expect(
        (
          await accepter(tokenClient, protocoleId, {
            nom: 'Fatou Ba',
            accepte: false,
          })
        ).status,
      ).toBe(400);
      // Un autre client ne peut pas accepter à sa place.
      expect(
        (
          await accepter(tokenAutreClient, protocoleId, {
            nom: 'Omar Sow',
            accepte: true,
          })
        ).status,
      ).toBe(404);

      const reponse = await accepter(tokenClient, protocoleId, {
        nom: '  Fatou   Ba ',
        accepte: true,
      });
      expect(reponse.status).toBe(201);

      const detail = await get(tokenSecretaire, `/${protocoleId}`);
      expect(detail.body.statut).toBe('signe_client');
      expect(detail.body.acceptationEnLigne).toMatchObject({
        nom: 'Fatou Ba',
        appareil: 'Navigateur-de-test',
      });
      expect(detail.body.acceptationEnLigne.empreinte).toMatch(
        /^[0-9a-f]{64}$/,
      );
      const historique = JSON.stringify(detail.body.historique);
      expect(historique).toContain('Accepté en ligne');

      // Une seule acceptation : la deuxième est refusée, et le portail n’offre plus rien.
      expect(
        (
          await accepter(tokenClient, protocoleId, {
            nom: 'Fatou Ba',
            accepte: true,
          })
        ).status,
      ).toBe(409);
      const protocole = (await portail()).find((p) => p.id === protocoleId);
      expect(protocole?.etape).toBe('signe');
      expect(protocole?.peutAccepterEnLigne).toBe(false);
    });

    it('un client de chantier voit son protocole et peut l’accepter en ligne ; un locataire voit celui de son bail', async () => {
      const { prisma, data } = context;
      await reglage(true);
      const roleClient = await data.seedRoleWithPermissions(
        'client_chantier',
        [],
      );
      const prospect = await prisma.prospect.create({
        data: { nom: 'Kane', prenom: 'Salif', telephone: '774444444' },
      });
      const chantier = await prisma.projetConstruction.create({
        data: {
          referenceInterne: 'CH-LIGNE-1',
          clientId: prospect.id,
          intitule: 'Villa Kane',
          typeProjet: 'villa',
        },
      });
      const proprietaire = await data.seedProprietaire();
      const bien = await prisma.bienLocatif.create({
        data: {
          referenceInterne: 'BL-LIGNE-1',
          proprietaireId: proprietaire.id,
          type: 'studio',
          adresse: 'Mermoz',
        },
      });
      const locataire = await prisma.locataire.create({
        data: { firstName: 'Awa', lastName: 'Gaye' },
      });
      const bail = await prisma.bailLocatif.create({
        data: {
          referenceInterne: 'B-LIGNE-1',
          bienLocatifId: bien.id,
          locataireId: locataire.id,
          loyerMensuel: 100_000,
          dateDebut: new Date('2026-01-01T00:00:00Z'),
        },
      });
      const userChantier = await data.seedUser({
        email: 'salif.kane@client.test',
        password: PASSWORD,
        firstName: 'Salif',
        clientProspectId: prospect.id,
      });
      const userLocataire = await data.seedUser({
        email: 'awa.gaye@client.test',
        password: PASSWORD,
        firstName: 'Awa',
        clientLocataireId: locataire.id,
      });
      await data.linkUserRole(userChantier.id, roleClient.id);
      await data.linkUserRole(userLocataire.id, roleClient.id);
      const jetonChantier = await login('salif.kane@client.test');
      const jetonLocataire = await login('awa.gaye@client.test');

      const envoyer = async (corps: Record<string, unknown>) => {
        const id = (
          await request(app.getHttpServer())
            .post('/api/protocoles')
            .set('Authorization', `Bearer ${tokenSecretaire}`)
            .send(corps)
        ).body.id as string;
        await deposer(tokenSecretaire, id, 'prepare');
        await statut(tokenSecretaire, id, { statut: 'prepare_a_verifier' });
        await statut(tokenSecretaire, id, {
          statut: 'envoye',
          dateEnvoi: '2026-11-10',
          moyenEnvoi: 'email',
        });
        return id;
      };
      const idChantier = await envoyer({
        projetConstructionId: chantier.id,
        titre: 'Protocole chantier',
      });
      const idBail = await envoyer({
        bailLocatifId: bail.id,
        titre: 'Protocole bail',
      });

      const mes = (jeton: string) =>
        request(app.getHttpServer())
          .get('/api/protocoles/client/mes-protocoles')
          .set('Authorization', `Bearer ${jeton}`);
      const duChantier = (await mes(jetonChantier)).body as {
        id: string;
        peutAccepterEnLigne: boolean;
        reference: string;
      }[];
      expect(duChantier.map((p) => p.id)).toEqual([idChantier]);
      expect(duChantier[0].peutAccepterEnLigne).toBe(true);
      expect(
        ((await mes(jetonLocataire)).body as { id: string }[]).map((p) => p.id),
      ).toEqual([idBail]);
      expect(JSON.stringify((await mes(jetonLocataire)).body)).not.toMatch(
        /moyenEnvoi|a_valider_direction/,
      );

      // Le locataire ne peut pas accepter le protocole du chantier d'un autre.
      expect(
        (
          await accepter(jetonLocataire, idChantier, {
            nom: 'Awa Gaye',
            accepte: true,
          })
        ).status,
      ).toBe(404);
      expect(
        (
          await accepter(jetonChantier, idChantier, {
            nom: 'Salif Kane',
            accepte: true,
          })
        ).status,
      ).toBe(201);
      expect((await get(tokenSecretaire, `/${idChantier}`)).body.statut).toBe(
        'signe_client',
      );
      expect(
        (
          await accepter(jetonLocataire, idBail, {
            nom: 'Awa Gaye',
            accepte: true,
          })
        ).status,
      ).toBe(201);
    });

    it('refuse un protocole sans document préparé ou pas encore envoyé', async () => {
      const { prisma } = context;
      const dossier = await prisma.dossierVente.findFirstOrThrow({
        where: { referenceInterne: 'VTE-LIGNE-1' },
      });
      const brouillon = await prisma.protocoleDossier.create({
        data: {
          dossierVenteId: dossier.id,
          statut: 'envoye',
          dateEnvoi: new Date(),
          moyenEnvoi: 'email',
        },
      });
      // Envoyé « à la main » sans document ni empreinte : rien à accepter.
      expect(
        (
          await accepter(tokenClient, brouillon.id, {
            nom: 'Fatou Ba',
            accepte: true,
          })
        ).status,
      ).toBe(409);
      const preparation = await prisma.protocoleDossier.create({
        data: { dossierVenteId: dossier.id, statut: 'a_preparer' },
      });
      expect(
        (
          await accepter(tokenClient, preparation.id, {
            nom: 'Fatou Ba',
            accepte: true,
          })
        ).status,
      ).toBe(409);
    });
  });
});
