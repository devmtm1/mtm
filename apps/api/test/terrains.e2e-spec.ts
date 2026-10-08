import { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import ExcelJS from 'exceljs';
import { authenticator } from 'otplib';
import request from 'supertest';
import { createE2eApp, type E2eContext } from './helpers/e2e-app';
import { describeE2e } from './helpers/e2e-database';

/**
 * Test e2e du parcours Terrains J1.1 / J1.2 :
 *  - création d'une fiche terrain interne
 *  - justification obligatoire sur les champs sensibles (audit Phase 1)
 *  - justification obligatoire sur le changement de statut juridique
 *  - masquage des données financières sans permission dédiée
 *  - catalogue public + filtre par vocation (audit Phase 1)
 *  - non-exposition des champs internes sur la fiche publique
 */
describeE2e('Parcours Terrains J1.1/J1.2 (e2e)', () => {
  let app: INestApplication;
  let context: E2eContext;
  let data: E2eContext['data'];

  const ADMIN_PASSWORD = 'AdminPassword123!';
  const ADMIN_2FA_SECRET = 'JBSWY3DPEHPK3PXP';
  let adminEmail: string;
  let accessToken: string;
  let commercialAccessToken: string;
  let commercialUserId: string;
  let terrainId: string;

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
    data = context.data;

    const adminRole = await data.seedRole('administrateur', true);
    const adminPermissions = [
      'terrains:consulter',
      'terrains:creer',
      'terrains:modifier',
      'terrains:valider',
      'terrains:consulter_financier',
      'audit:consulter',
    ];
    for (const name of adminPermissions) {
      const permission = await data.seedPermission(name);
      await data.linkRolePermission(adminRole.id, permission.id);
    }

    await data.seedSystemSetting({
      key: 'terrains.statutJuridique',
      value: ['Titre foncier', 'Bail', 'Régularisation en cours'],
    });
    await data.seedSystemSetting({
      key: 'terrains.niveauVerification',
      value: ['Non vérifié', 'En cours', 'Vérifié'],
    });
    await data.seedSystemSetting({
      key: 'terrains.statutCommercial',
      value: ['Brouillon', 'Disponible', 'Réservé', 'Vendu'],
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

    // Un commercial sans la permission terrains:consulter_financier, pour
    // vérifier le masquage des champs sensibles (prix d'acquisition, marge).
    const commercialRole = await data.seedRole('commercial');
    await data.linkRolePermission(
      commercialRole.id,
      (await data.seedPermission('terrains:consulter')).id,
    );
    const commercialUser = await data.seedUser({
      email: 'commercial@mtm-immobilier.sn',
      password: await bcrypt.hash('password', 4),
      firstName: 'Fatou',
      lastName: 'Diop',
    });
    await data.linkUserRole(commercialUser.id, commercialRole.id);
    commercialUserId = commercialUser.id;
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
    accessToken = response.body.accessToken;
  });

  it('étape 1bis — connexion du commercial', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'commercial@mtm-immobilier.sn',
        password: 'password',
      });

    expect(response.status).toBe(201);
    commercialAccessToken = response.body.accessToken;
  });

  it('étape 2 — création d’une fiche terrain avec points d’intérêt structurés', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/terrains')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        referenceInterne: 'TER-E2E-001',
        nom: 'Terrain e2e Diamniadio',
        statutJuridique: 'Titre foncier',
        niveauVerification: 'Vérifié',
        region: 'Dakar',
        commune: 'Diamniadio',
        superficie: 600,
        prixAcquisition: 5000000,
        prixPublic: 8000000,
        commission: 200000,
        statutCommercial: 'Disponible',
        vocation: 'residentiel',
        commercialResponsableId: commercialUserId,
        pointsInteret: [
          { nom: 'École primaire', type: 'education', distanceKm: 1.2 },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.referenceInterne).toBe('TER-E2E-001');
    expect(response.body.pointsInteret).toEqual([
      { nom: 'École primaire', type: 'education', distanceKm: 1.2 },
    ]);
    terrainId = response.body.id;
  });

  it('rejette une fiche avec un point d’intérêt mal formé', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/terrains')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        referenceInterne: 'TER-E2E-INVALID',
        nom: 'Terrain invalide',
        statutJuridique: 'Titre foncier',
        niveauVerification: 'Vérifié',
        statutCommercial: 'Disponible',
        pointsInteret: [{ nom: '', latitude: 999 }],
      });

    expect(response.status).toBe(400);
  });

  it('rejette la modification du prix d’acquisition sans justification', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/terrains/${terrainId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ prixAcquisition: 5500000 });

    expect(response.status).toBe(400);
  });

  it('accepte la modification du prix d’acquisition avec justification', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/terrains/${terrainId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        prixAcquisition: 5500000,
        justification: 'Réévaluation suite à négociation avec le propriétaire',
      });

    expect(response.status).toBe(200);
    expect(Number(response.body.prixAcquisition)).toBe(5500000);
  });

  it('rejette le changement de statut juridique sans justification', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/terrains/${terrainId}/juridical-status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ value: 'Bail' });

    expect(response.status).toBe(400);
  });

  it('accepte le changement de statut juridique avec justification', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/terrains/${terrainId}/juridical-status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        value: 'Bail',
        justification: 'Document de titre foncier non encore délivré',
      });

    expect(response.status).toBe(200);
    expect(response.body.statutJuridique).toBe('Bail');
  });

  it('masque les champs financiers pour un commercial sans permission dédiée', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/terrains/${terrainId}`)
      .set('Authorization', `Bearer ${commercialAccessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.prixAcquisition).toBeNull();
    expect(response.body.marge).toBeNull();
    expect(response.body.commission).toBeNull();
  });

  it('expose les champs financiers pour un administrateur habilité', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/terrains/${terrainId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(Number(response.body.prixAcquisition)).toBe(5500000);
  });

  it('étape 3 — catalogue public filtré par vocation', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/terrains/public?vocation=residentiel',
    );

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].id).toBe(terrainId);
  });

  it('le catalogue public filtré sur une autre vocation ne retourne rien', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/terrains/public?vocation=commercial',
    );

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(0);
  });

  it('étape 4 — fiche publique sans donnée interne', async () => {
    const response = await request(app.getHttpServer()).get(
      `/api/terrains/public/${terrainId}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).not.toHaveProperty('prixAcquisition');
    expect(response.body).not.toHaveProperty('marge');
    expect(response.body).not.toHaveProperty('commission');
    expect(response.body).not.toHaveProperty('notesInternes');
    expect(response.body.pointsInteret).toEqual([
      { nom: 'École primaire', type: 'education', distanceKm: 1.2 },
    ]);
  });

  it('récupère les options de statuts', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/terrains/options')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.statutJuridique).toContain('Titre foncier');
  });

  it('archive les modifications sensibles dans le journal d’audit avec justification', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/audit')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    const priceUpdate = response.body.items.find(
      (item: { action: string; justification?: string }) =>
        item.action === 'terrain.updated',
    );
    expect(priceUpdate).toBeDefined();
    expect(priceUpdate.justification).toContain('Réévaluation');
    // La trace doit porter les vrais montants. Enregistrée depuis la vue de
    // son auteur, elle notait « null → null » quand celui-ci n'avait pas
    // accès au financier : le journal était aveugle sur les champs mêmes
    // qu'il existe pour protéger (section 8 du cahier des charges).
    expect(Number(priceUpdate.newValue.prixAcquisition)).toBe(5500000);
    expect(Number(priceUpdate.oldValue.prixAcquisition)).toBe(5000000);
  });

  describe('suivi du portefeuille et archivage (reprise du tableur)', () => {
    const auth = () => ({ Authorization: `Bearer ${accessToken}` });
    const ids = (corps: { items: Array<{ id: string }> }) =>
      corps.items.map((t) => t.id);

    it('enregistre les champs du tableur et masque le prix de cession au commercial', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/terrains/${terrainId}`)
        .set(auth())
        .send({
          prixCession: 4500000,
          justification: 'Prix de cession convenu avec le vendeur',
          nombreLots: 6,
          dateEntree: '2026-07-07',
          modalitePaiement: 'Moratoire',
          dureeMoratoireMois: 12,
          produitDirect: true,
          protocoleAccord: true,
          statutVisite: 'À visiter',
          contactVendeurNom: 'Maty KHOULE',
          contactVendeurTelephone: '777123520',
          referenceDocumentFoncier: 'DEL-2024-118',
          dateDocumentFoncier: '2024-03-15',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        nombreLots: 6,
        modalitePaiement: 'Moratoire',
        produitDirect: true,
        protocoleAccord: true,
        statutVisite: 'À visiter',
        contactVendeurNom: 'Maty KHOULE',
      });
      expect(response.body.dateEntree).toContain('2026-07-07');

      const commercial = await request(app.getHttpServer())
        .get(`/api/terrains/${terrainId}`)
        .set('Authorization', `Bearer ${commercialAccessToken}`);
      expect(commercial.status).toBe(200);
      expect(commercial.body.prixCession).toBeNull();
      expect(commercial.body.nombreLots).toBe(6);
    });

    it('exige une justification pour changer le prix de cession', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/terrains/${terrainId}`)
        .set(auth())
        .send({ prixCession: 4800000 });
      expect(response.status).toBe(400);
    });

    it('retrouve un bien par le nom ou le téléphone du vendeur', async () => {
      const parNom = await request(app.getHttpServer())
        .get('/api/terrains?search=khoule')
        .set(auth());
      expect(ids(parNom.body)).toContain(terrainId);
      const parTel = await request(app.getHttpServer())
        .get('/api/terrains?search=77%20712%2035%2020')
        .set(auth());
      expect(ids(parTel.body)).toContain(terrainId);
      const filtre = await request(app.getHttpServer())
        .get('/api/terrains?modalitePaiement=Moratoire&produitDirect=true')
        .set(auth());
      expect(ids(filtre.body)).toEqual([terrainId]);
    });

    it('refuse une modalité de paiement hors paramétrage', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/terrains/${terrainId}`)
        .set(auth())
        .send({ modalitePaiement: 'Troc' });
      expect(response.status).toBe(400);
    });

    it('tient les notes de suivi du bien', async () => {
      const cree = await request(app.getHttpServer())
        .post(`/api/terrains/${terrainId}/notes`)
        .set(auth())
        .send({ texte: 'Vendeur rappelé, visite prévue samedi' });
      expect(cree.status).toBe(201);
      const liste = await request(app.getHttpServer())
        .get(`/api/terrains/${terrainId}/notes`)
        .set(auth());
      expect(liste.status).toBe(200);
      expect(liste.body[0]).toMatchObject({
        texte: 'Vendeur rappelé, visite prévue samedi',
        auteur: { lastName: 'MTM' },
      });
    });

    it('exige un motif pour archiver, et un commercial ne le peut pas', async () => {
      const sansMotif = await request(app.getHttpServer())
        .patch(`/api/terrains/${terrainId}/archive`)
        .set(auth())
        .send({});
      expect(sansMotif.status).toBe(400);
      const commercial = await request(app.getHttpServer())
        .patch(`/api/terrains/${terrainId}/archive`)
        .set('Authorization', `Bearer ${commercialAccessToken}`)
        .send({ motif: 'Test' });
      expect(commercial.status).toBe(403);
    });

    it('archive : le bien quitte la liste et le site public, mais reste consultable', async () => {
      const archive = await request(app.getHttpServer())
        .patch(`/api/terrains/${terrainId}/archive`)
        .set(auth())
        .send({ motif: 'Doublon avec une autre fiche' });
      expect(archive.status).toBe(200);
      expect(archive.body.archiveLe).toBeTruthy();
      expect(archive.body.motifArchivage).toBe('Doublon avec une autre fiche');

      const liste = await request(app.getHttpServer())
        .get('/api/terrains')
        .set(auth());
      expect(ids(liste.body)).not.toContain(terrainId);
      const archives = await request(app.getHttpServer())
        .get('/api/terrains?archivage=archives')
        .set(auth());
      expect(ids(archives.body)).toEqual([terrainId]);

      const catalogue = await request(app.getHttpServer()).get(
        '/api/terrains/public',
      );
      expect(ids(catalogue.body)).not.toContain(terrainId);
      const fichePublique = await request(app.getHttpServer()).get(
        `/api/terrains/public/${terrainId}`,
      );
      expect(fichePublique.status).toBe(404);

      const fiche = await request(app.getHttpServer())
        .get(`/api/terrains/${terrainId}`)
        .set(auth());
      expect(fiche.status).toBe(200);
      expect(fiche.body.referenceInterne).toBe('TER-E2E-001');
    });

    it('un bien archivé ne se modifie plus avant restauration', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/terrains/${terrainId}`)
        .set(auth())
        .send({ nom: 'Renommé' });
      expect(response.status).toBe(409);
    });

    it('restaure : le bien reparaît partout, intact, sans fuite du suivi interne', async () => {
      const restaure = await request(app.getHttpServer())
        .patch(`/api/terrains/${terrainId}/restore`)
        .set(auth());
      expect(restaure.status).toBe(200);
      expect(restaure.body.archiveLe).toBeNull();

      const liste = await request(app.getHttpServer())
        .get('/api/terrains')
        .set(auth());
      expect(ids(liste.body)).toContain(terrainId);
      const fichePublique = await request(app.getHttpServer()).get(
        `/api/terrains/public/${terrainId}`,
      );
      expect(fichePublique.status).toBe(200);
      for (const interne of [
        'prixCession',
        'contactVendeurNom',
        'contactVendeurTelephone',
        'modalitePaiement',
        'produitDirect',
        'protocoleAccord',
        'notesInternes',
        'archiveLe',
      ]) {
        expect(fichePublique.body).not.toHaveProperty(interne);
      }
    });

    it('trace l’archivage et la restauration dans le journal', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/terrains/${terrainId}/history`)
        .set(auth());
      const actions = response.body.items.map(
        (i: { action: string }) => i.action,
      );
      expect(actions).toEqual(
        expect.arrayContaining(['terrain.archived', 'terrain.restored']),
      );
    });
  });

  describe('import d’un tableur Excel depuis le back-office', () => {
    const auth = () => ({ Authorization: `Bearer ${accessToken}` });
    const ids = (corps: { items: Array<{ id: string }> }) =>
      corps.items.map((t) => t.id);

    const ENTETE = [
      'N°',
      'MATRICUL',
      'LOCALITE',
      'Nbre T',
      'TITRE JURIDIQUE',
      'PRIX',
      'PROPRIETAIRE /MANDATAIRE',
      'TELEPHONE',
      'VENDU',
      'SURFACE',
      'MODALITE DE PAIEMENT',
      'DATE ENTREE',
    ];

    async function classeur(
      lignes: Array<Array<string | number>>,
      onglet = 'BD officielle',
    ): Promise<Buffer> {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(onglet);
      // Lignes de titre avant l'en-tête, comme dans le tableur de MTM.
      ws.addRow(['Bd terrains MTM IMMO - Officiel']);
      ws.addRow([]);
      ws.addRow(ENTETE);
      lignes.forEach((l) => ws.addRow(l));
      return Buffer.from(await wb.xlsx.writeBuffer());
    }

    const LIGNES = [
      [
        1,
        'IMP-A',
        'Thiès',
        3,
        'Bail',
        8000000,
        'Maty KHOULE',
        '77 712 35 20',
        'DISPONIBLE',
        '150m²',
        'cash',
        '07/07/2026',
      ],
      [
        2,
        'IMP-B',
        'Mbour',
        1,
        'Bail',
        '2 million 700',
        'Fama',
        '33 601 10 81 77',
        'A VISITER DISPONIBLE',
        '7 Ha',
        'moratoi',
        '',
      ],
      [3, 'IMP-C', 'Diass', 1, 'DG', 3000000, '', '', '', '', '', ''],
      [4, 'TER-E2E-001', 'Déjà là', 1, 'Bail', 1000000, '', '', '', '', '', ''],
    ];

    const envoyer = (
      route: string,
      buffer: Buffer,
      champs: Record<string, string> = {},
      nom = 'bd-terrains.xlsx',
      token = accessToken,
    ) => {
      let req = request(app.getHttpServer())
        .post(`/api/terrains/${route}`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', buffer, nom);
      for (const [k, v] of Object.entries(champs)) req = req.field(k, v);
      return req;
    };

    it('l’aperçu contrôle le fichier sans rien écrire', async () => {
      const avant = await request(app.getHttpServer())
        .get('/api/terrains?pageSize=200')
        .set(auth());

      const reponse = await envoyer('import/preview', await classeur(LIGNES));

      expect(reponse.status).toBe(201);
      expect(reponse.body).toMatchObject({
        feuille: 'BD officielle',
        aCreer: 2,
        dejaPresents: 1,
        refuses: 1,
      });
      expect(reponse.body.lignesRefusees[0].raison).toContain(
        'titre juridique non reconnu « DG »',
      );
      // Numéros de ligne tels qu'affichés dans Excel : en-tête ligne 3.
      expect(reponse.body.lignesRefusees[0].ligne).toBe(6);
      expect(
        reponse.body.apercu.map(
          (b: { referenceInterne: string }) => b.referenceInterne,
        ),
      ).toEqual(['IMP-A', 'IMP-B']);

      const apres = await request(app.getHttpServer())
        .get('/api/terrains?pageSize=200')
        .set(auth());
      expect(apres.body.total).toBe(avant.body.total);
    });

    it('importe en Brouillon, sans rien publier, et rapporte le détail', async () => {
      const reponse = await envoyer('import', await classeur(LIGNES));

      expect(reponse.status).toBe(201);
      expect(reponse.body).toMatchObject({
        crees: 2,
        refuses: 1,
        dejaPresents: 1,
      });

      const liste = await request(app.getHttpServer())
        .get('/api/terrains?search=IMP-')
        .set(auth());
      expect(liste.body.total).toBe(2);
      const parRef = Object.fromEntries(
        liste.body.items.map((t: { referenceInterne: string }) => [
          t.referenceInterne,
          t,
        ]),
      );
      expect(parRef['IMP-A']).toMatchObject({
        statutCommercial: 'Brouillon',
        nombreLots: 3,
        contactVendeurNom: 'Maty KHOULE',
        modalitePaiement: 'Cash',
      });
      expect(parRef['IMP-A'].dateEntree).toContain('2026-07-07');
      expect(Number(parRef['IMP-B'].prixPublic)).toBe(2_700_000);
      expect(Number(parRef['IMP-B'].superficie)).toBe(70_000);
      expect(parRef['IMP-B'].statutVisite).toBe('À visiter');

      const catalogue = await request(app.getHttpServer()).get(
        '/api/terrains/public',
      );
      expect(
        catalogue.body.items.some((t: { referenceInterne: string }) =>
          t.referenceInterne.startsWith('IMP-'),
        ),
      ).toBe(false);
    });

    it('réimporter le même fichier ne crée aucun doublon', async () => {
      const reponse = await envoyer('import', await classeur(LIGNES));
      expect(reponse.status).toBe(201);
      expect(reponse.body).toMatchObject({ crees: 0, dejaPresents: 3 });
    });

    it('reprend l’onglet ARCHIVES déjà archivé', async () => {
      const buffer = await classeur(
        [
          [
            9,
            'IMP-OLD',
            'Ancien site',
            1,
            'Bail',
            5000000,
            '',
            '',
            'Vendu',
            '',
            '',
            '',
          ],
        ],
        'ARCHIVES',
      );
      const reponse = await envoyer('import', buffer, {
        feuille: 'ARCHIVES',
        archives: 'true',
      });
      expect(reponse.body.crees).toBe(1);

      const archives = await request(app.getHttpServer())
        .get('/api/terrains?archivage=archives')
        .set(auth());
      expect(
        archives.body.items.map(
          (t: { referenceInterne: string }) => t.referenceInterne,
        ),
      ).toContain('IMP-OLD');
      const actifs = await request(app.getHttpServer())
        .get('/api/terrains?search=IMP-OLD')
        .set(auth());
      expect(actifs.body.total).toBe(0);
    });

    it('publie les « Disponible » seulement sur demande explicite', async () => {
      const buffer = await classeur([
        [
          10,
          'IMP-PUB',
          'Saly',
          1,
          'Bail',
          9000000,
          '',
          '',
          'DISPONIBLE',
          '300m²',
          '',
          '',
        ],
      ]);
      const reponse = await envoyer('import', buffer, {
        publierDisponibles: 'true',
      });
      expect(reponse.body.crees).toBe(1);

      const catalogue = await request(app.getHttpServer()).get(
        '/api/terrains/public',
      );
      expect(
        catalogue.body.items.some(
          (t: { referenceInterne: string }) => t.referenceInterne === 'IMP-PUB',
        ),
      ).toBe(true);
    });

    it('trace l’import dans le journal d’audit', async () => {
      const journal = await request(app.getHttpServer())
        .get('/api/audit?action=terrain.imported')
        .set(auth());
      expect(journal.status).toBe(200);
      expect(journal.body.items.length).toBeGreaterThanOrEqual(1);
    });

    it('refuse un utilisateur sans droit de création, un faux fichier et l’absence de fichier', async () => {
      const buffer = await classeur(LIGNES);
      const sansDroit = await envoyer(
        'import/preview',
        buffer,
        {},
        'a.xlsx',
        commercialAccessToken,
      );
      expect(sansDroit.status).toBe(403);

      const faux = await envoyer(
        'import/preview',
        Buffer.from('pas un classeur'),
        {},
        'a.xlsx',
      );
      expect(faux.status).toBe(400);

      const vide = await request(app.getHttpServer())
        .post('/api/terrains/import/preview')
        .set(auth());
      expect(vide.status).toBe(400);
    });
  });
});
