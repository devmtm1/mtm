import { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';

import request from 'supertest';
import { createE2eApp, type E2eContext } from './helpers/e2e-app';
import { createCloudinaryMock } from './helpers/cloudinary-mock';
import { describeE2e } from './helpers/e2e-database';

/**
 * Test e2e du parcours J1.6 — Ventes, réservations, paiements, commissions, GED :
 *  - création dossier de vente
 *  - réservation
 *  - paiement + validation
 *  - commission + validation + paiement
 *  - génération document
 *  - dashboard commercial
 *  - recherche documents
 */
describeE2e('Parcours J1.6 Ventes (e2e)', () => {
  let app: INestApplication;
  let context: E2eContext;
  let data: E2eContext['data'];

  const ADMIN_PASSWORD = 'AdminPassword123!';
  const ADMIN_2FA_SECRET = 'JBSWY3DPEHPK3PXP';
  let adminEmail: string;
  let accessToken: string;
  let prospectId: string;
  let terrainId: string;
  let dossierId: string;
  let paymentId: string;
  let valideurId: string;

  beforeAll(async () => {
    context = await createE2eApp({
      cloudinary: createCloudinaryMock('mtm-e2e/ventes-doc'),
    });
    app = context.app;
    data = context.data;

    const adminRole = await data.seedRole('administrateur', true);
    const permissionNames = [
      'ventes:consulter',
      'ventes:creer',
      'ventes:modifier',
      'ventes:valider',
      'ventes:payer',
      'ventes:exporter',
      'ventes:publier',
      'ventes:administrer',
      'crm:consulter',
      'crm:creer',
      'crm:modifier',
      'terrains:consulter',
      'terrains:creer',
      'terrains:modifier',
      'terrains:valider',
    ];
    for (const name of permissionNames) {
      const permission = await data.seedPermission(name);
      await data.linkRolePermission(adminRole.id, permission.id);
    }

    await data.seedSystemSetting({
      key: 'ventes.statuts',
      value: [
        'en_cours',
        'pre_reserve',
        'reserve',
        'paiement_partiel',
        'solde',
        'annule',
      ],
    });
    await data.seedSystemSetting({
      key: 'ventes.transitions',
      value: {
        en_cours: ['pre_reserve', 'reserve', 'annule'],
        pre_reserve: ['reserve', 'en_cours', 'annule'],
        reserve: ['paiement_partiel', 'en_cours', 'annule'],
        paiement_partiel: ['solde', 'annule'],
        solde: [],
        annule: ['en_cours'],
      },
    });
    await data.seedSystemSetting({
      key: 'paiements.modesAutorises',
      value: ['especes', 'virement', 'en_ligne'],
    });
    await data.seedSystemSetting({
      key: 'ventes.documentTypes',
      value: [
        'bon_reservation',
        'recu',
        'facture',
        'contrat',
        'etat_paiement',
        'justificatif',
        'autre',
      ],
    });
    await data.seedSystemSetting({
      key: 'ventes.echeancesDefaut',
      value: 3,
    });

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 4);
    adminEmail = 'admin@mtm-immobilier.sn';
    const adminUser = await data.seedUser({
      email: adminEmail,
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'MTM',
      twoFactorEnabled: true,
      twoFactorSecret: ADMIN_2FA_SECRET,
    });
    await data.linkUserRole(adminUser.id, adminRole.id);

    // Un valideur distinct de l'auteur des paiements, sans rôle sensible (pas de 2FA).
    const valideurRole = await data.seedRoleWithPermissions(
      'valideur_paiements',
      ['ventes:consulter', 'ventes:valider'],
    );
    const valideur = await data.seedUser({
      email: 'valideur@mtm-immobilier.sn',
      password: ADMIN_PASSWORD,
    });
    valideurId = valideur.id;
    await data.linkUserRole(valideur.id, valideurRole.id);
  });

  afterAll(async () => {
    await context.close();
  });

  it('étape 1 — connexion de l’administrateur', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: adminEmail,
        password: ADMIN_PASSWORD,
        twoFactorCode: authenticator.generate(ADMIN_2FA_SECRET),
      });

    expect(response.status).toBe(201);
    expect(response.body.requiresTwoFactor).toBe(false);
    expect(response.body.accessToken).toEqual(expect.any(String));
    accessToken = response.body.accessToken;
  });

  it('étape 2 — création d’un prospect', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/crm/prospects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        nom: 'Dupont',
        prenom: 'Jean',
        email: 'jean.dupont@example.com',
        telephone: '77000000',
        paysResidence: 'Sénégal',
        sourceAcquisition: 'site',
        besoins: 'Terrain pour construction',
        budgetMin: 5000000,
        budgetMax: 10000000,
      });

    expect(response.status).toBe(201);
    expect(response.body.id).toEqual(expect.any(String));
    prospectId = response.body.id;
  });

  it('étape 3 — création d’un terrain', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/terrains')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        referenceInterne: 'TER-E2E-001',
        nom: 'Terrain E2E',
        statutJuridique: 'Titre foncier',
        niveauVerification: 'Vérifié',
        region: 'Dakar',
        commune: 'Dakar',
        superficie: 500,
        prixPublic: 10000000,
        statutCommercial: 'Disponible',
      });

    expect(response.status).toBe(201);
    expect(response.body.id).toEqual(expect.any(String));
    terrainId = response.body.id;
  });

  it('étape 4 — création d’un dossier de vente', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/ventes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        prospectId,
        terrainId,
        prixVente: 10000000,
        statut: 'en_cours',
      });

    expect(response.status).toBe(201);
    expect(response.body.id).toEqual(expect.any(String));
    expect(response.body.referenceInterne).toMatch(/^DV-/);
    expect(response.body.statut).toBe('en_cours');
    dossierId = response.body.id;
  });

  it('étape 5 — création d’une réservation', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/ventes/${dossierId}/reservations`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        montantAcompte: 1000000,
        dureeBlocageJours: 7,
        conditionsAnnulation: 'Remboursable sous 48h',
      });

    expect(response.status).toBe(201);
    expect(response.body.id).toEqual(expect.any(String));
    // Les Decimal Prisma sont sérialisés en chaîne — c'est le contrat réel
    // que consomme le back-office (vente.model.ts : number | string).
    expect(Number(response.body.montantAcompte)).toBe(1000000);
  });

  it('étape 6 — création d’un paiement', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/ventes/${dossierId}/paiements`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        montant: 2000000,
        mode: 'virement',
        reference: 'VIR-001',
      });

    expect(response.status).toBe(201);
    expect(response.body.payment.id).toEqual(expect.any(String));
    expect(response.body.payment.statut).toBe('en_attente');
    paymentId = response.body.payment.id;
  });

  it('étape 7 — validation du paiement', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/ventes/${dossierId}/paiements/${paymentId}/validate`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(201);
    expect(response.body.payment.statut).toBe('valide');
  });

  it('étape 8 — dashboard commercial', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/ventes/dashboard/stats')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.totalDossiers).toBeGreaterThanOrEqual(1);
    expect(response.body.dossiersParStatut).toBeDefined();
  });

  it('étape 9 — recherche de documents', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/ventes/documents/search')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ dossierVenteId: dossierId });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('étape 10 — refus d’un paiement en attente, hors du montant payé', async () => {
    const created = await request(app.getHttpServer())
      .post(`/api/ventes/${dossierId}/paiements`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        montant: 100000,
        mode: 'virement',
        reference: 'VIR-INTROUVABLE',
      });
    expect(created.status).toBe(201);
    const refusedId = created.body.payment.id;

    const sansMotif = await request(app.getHttpServer())
      .post(`/api/ventes/${dossierId}/paiements/${refusedId}/refuse`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});
    expect(sansMotif.status).toBe(400);

    const refused = await request(app.getHttpServer())
      .post(`/api/ventes/${dossierId}/paiements/${refusedId}/refuse`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ motif: 'Virement introuvable sur le relevé' });
    expect(refused.status).toBe(201);
    expect(refused.body.statut).toBe('refuse');

    // Un paiement refusé ne peut plus être validé.
    const validate = await request(app.getHttpServer())
      .post(`/api/ventes/${dossierId}/paiements/${refusedId}/validate`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(validate.status).toBe(404);

    // Un paiement déjà validé ne se refuse pas.
    const dejaValide = await request(app.getHttpServer())
      .post(`/api/ventes/${dossierId}/paiements/${paymentId}/refuse`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ motif: 'Trop tard' });
    expect(dejaValide.status).toBe(409);
  });

  it('étape 11 — un document envoyé « non public » reste privé (formulaire multipart)', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/ventes/${dossierId}/documents`)
      .set('Authorization', `Bearer ${accessToken}`)
      .field('type', 'justificatif')
      .field('isPublic', 'false')
      .attach('file', Buffer.from('%PDF-1.4 e2e'), {
        filename: 'justificatif.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(201);
    expect(response.body.isPublic).toBe(false);
  });

  describe('notifications internes', () => {
    let valideurToken: string;
    let notificationId: string;

    it('le valideur reçoit une notification par paiement à valider, pas l’auteur', async () => {
      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'valideur@mtm-immobilier.sn',
          password: ADMIN_PASSWORD,
        });
      expect(login.status).toBe(201);
      valideurToken = login.body.accessToken;

      const response = await request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${valideurToken}`);

      expect(response.status).toBe(200);
      const types = response.body.items.map(
        (item: { type: string }) => item.type,
      );
      expect(types).toContain('paiement_a_valider');
      expect(response.body.nonLues).toBe(response.body.items.length);
      notificationId = response.body.items[0].id;

      const auteur = await request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(auteur.body.items).toHaveLength(0);
    });

    it('ne notifie pas deux fois la même alerte', async () => {
      const avant = await context.prisma.notification.count({
        where: { userId: valideurId },
      });
      const { NotificationsService } =
        await import('../src/modules/notifications/notifications.service');
      const service = app.get(NotificationsService);
      const input = {
        type: 'mandat_echeance',
        titre: 'Mandat M-1 : échéance dans 3 jour(s)',
        dedupeKey: 'mandat-echeance:m1:2026-10-06',
      };
      expect(await service.notifier([valideurId], input)).toBe(1);
      expect(await service.notifier([valideurId], input)).toBe(0);
      const apres = await context.prisma.notification.count({
        where: { userId: valideurId },
      });
      expect(apres).toBe(avant + 1);
    });

    it('chacun ne marque lue que sa propre notification', async () => {
      const autrui = await request(app.getHttpServer())
        .post(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(autrui.status).toBe(201);
      expect(autrui.body.marquees).toBe(0);

      const soi = await request(app.getHttpServer())
        .post(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${valideurToken}`);
      expect(soi.body.marquees).toBe(1);

      const tout = await request(app.getHttpServer())
        .post('/api/notifications/read-all')
        .set('Authorization', `Bearer ${valideurToken}`);
      expect(tout.status).toBe(201);

      const liste = await request(app.getHttpServer())
        .get('/api/notifications?nonLues=true')
        .set('Authorization', `Bearer ${valideurToken}`);
      expect(liste.body.items).toHaveLength(0);
      expect(liste.body.nonLues).toBe(0);
    });
  });

  describe('contre-passation et annulation avec paiements', () => {
    it('refuse la contre-passation à qui n’a pas ventes:administrer', async () => {
      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'valideur@mtm-immobilier.sn',
          password: ADMIN_PASSWORD,
        });
      const response = await request(app.getHttpServer())
        .post(`/api/ventes/${dossierId}/paiements/${paymentId}/reverse`)
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .send({ motif: 'Tentative non autorisée' });
      expect(response.status).toBe(403);
    });

    it('contre-passe un paiement validé : le montant payé et le statut du dossier suivent', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/ventes/${dossierId}/paiements/${paymentId}/reverse`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          motif: 'Virement rejeté par la banque',
          remboursement: false,
        });

      expect(response.status).toBe(201);
      expect(response.body.statut).toBe('annule');
      // Il reste l'acompte de réservation (1 000 000), validé à la réservation.
      expect(response.body.montantPaye).toBe(1000000);
      expect(response.body.statutDossier).toBe('paiement_partiel');

      // Un paiement déjà contre-passé ne se contre-passe pas deux fois.
      const encore = await request(app.getHttpServer())
        .post(`/api/ventes/${dossierId}/paiements/${paymentId}/reverse`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ motif: 'Deuxième fois' });
      expect(encore.status).toBe(404);

      const dossier = await request(app.getHttpServer())
        .get(`/api/ventes/${dossierId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      const annule = dossier.body.paiements.find(
        (payment: { id: string }) => payment.id === paymentId,
      );
      expect(annule.statut).toBe('annule');
      expect(annule.notes).toContain('Virement rejeté par la banque');
    });

    it('exige un motif pour annuler un dossier qui a encaissé de l’argent', async () => {
      const sansMotif = await request(app.getHttpServer())
        .post(`/api/ventes/${dossierId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ statut: 'annule' });
      expect(sansMotif.status).toBe(409);

      const avecMotif = await request(app.getHttpServer())
        .post(`/api/ventes/${dossierId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          statut: 'annule',
          motif: 'Acompte conservé selon les conditions de réservation',
        });
      expect(avecMotif.status).toBe(201);
      expect(avecMotif.body.statut).toBe('annule');
    });
  });
});
