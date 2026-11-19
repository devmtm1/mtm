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
      ((await get(tokenDirection, '/alertes')).body as { reference: string }[]).map(
        (alerte) => alerte.reference,
      );

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
});
