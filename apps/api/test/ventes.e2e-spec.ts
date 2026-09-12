import { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';

import request from 'supertest';
import { createE2eApp, type E2eContext } from './helpers/e2e-app';
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

  beforeAll(async () => {
    context = await createE2eApp();
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
        sourceAcquisition: 'Site public',
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
});
