// Plusieurs comptes se connectent à la suite : on relève la limite de connexions.
process.env.LOGIN_RATE_LIMIT_MAX = '100';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2eApp, type E2eContext } from './helpers/e2e-app';
import { describeE2e } from './helpers/e2e-database';
import { PeriodesFinancieresService } from '../src/modules/finances/periodes.service';
import { DemarchesPaiementsService } from '../src/modules/demarches/demarches-paiements.service';
import { LOGO_PAR_DEFAUT_BASE64 } from '../src/common/pdf/logo-defaut';

/**
 * J3.1 — journal financier, revenu de MTM par activité, saisies validées à
 * deux, export tracé et clôture mensuelle.
 */
describeE2e('Finances (e2e)', () => {
  let app: INestApplication;
  let context: E2eContext;
  let tokenSaisie: string;
  let tokenControle: string;
  let tokenAdmin: string;
  let tokenLecteur: string;
  let tokenSansDroit: string;
  let idSaisie = '';
  let idControle = '';
  let idAdmin = '';
  let missionId = '';

  const PASSWORD = 'MotDePasse-Solide-2026';

  // Le mois précédent : un mois fini, que l'on peut clôturer.
  const maintenant = new Date();
  const debutMoisPrecedent = new Date(
    Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() - 1, 1),
  );
  const periode = `${debutMoisPrecedent.getUTCFullYear()}-${String(
    debutMoisPrecedent.getUTCMonth() + 1,
  ).padStart(2, '0')}`;
  const du = `${periode}-01`;
  const au = new Date(
    Date.UTC(
      debutMoisPrecedent.getUTCFullYear(),
      debutMoisPrecedent.getUTCMonth() + 1,
      0,
    ),
  )
    .toISOString()
    .slice(0, 10);
  const le15 = new Date(`${periode}-15T10:00:00.000Z`);
  const ISO15 = `${periode}-15`;

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

  const tableau = async (token = tokenLecteur) =>
    (await api('get', `/finances/tableau?du=${du}&au=${au}`, token)).body;

  const operation = (extra: Record<string, unknown> = {}) => ({
    sens: 'depense',
    activite: 'general',
    categorie: 'loyer_bureaux',
    libelle: 'Loyer des bureaux',
    montant: 200000,
    date: ISO15,
    ...extra,
  });

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
    const { data, prisma } = context;

    const roleSaisie = await data.seedRoleWithPermissions('saisie_finances', [
      'finances:consulter',
      'finances:creer',
      'finances:modifier',
    ]);
    const roleControle = await data.seedRoleWithPermissions(
      'controle_finances',
      ['finances:consulter', 'finances:valider', 'finances:exporter'],
    );
    const roleAdmin = await data.seedRoleWithPermissions('admin_finances', [
      'finances:consulter',
      'finances:creer',
      'finances:modifier',
      'finances:valider',
      'finances:exporter',
      'finances:administrer',
    ]);
    const roleLecteur = await data.seedRoleWithPermissions('lecteur_finances', [
      'finances:consulter',
    ]);
    const roleSans = await data.seedRoleWithPermissions('stagiaire', [
      'contact:consulter',
    ]);
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
    idSaisie = await creer('saisie@mtm.test', 'Sophie', roleSaisie);
    idControle = await creer('controle@mtm.test', 'Cheikh', roleControle);
    idAdmin = await creer('admin@mtm.test', 'Adama', roleAdmin);
    await creer('lecteur@mtm.test', 'Lamine', roleLecteur);
    await creer('sans@mtm.test', 'Seynabou', roleSans);

    // --- Ventes : un bien de marge 2 000 000 vendu 10 000 000, 5 000 000 déjà payés ---
    const terrain = await prisma.terrain.create({
      data: {
        referenceInterne: 'TR-FIN-1',
        nom: 'Terrain finances',
        statutJuridique: 'Titre foncier',
        niveauVerification: 'Vérifié',
        statutCommercial: 'Vendu',
        marge: 2_000_000,
      },
    });
    const prospect = await prisma.prospect.create({
      data: { nom: 'Ndiaye', prenom: 'Mame', statutPipeline: 'vente' },
    });
    const vente = await prisma.dossierVente.create({
      data: {
        prospectId: prospect.id,
        terrainId: terrain.id,
        referenceInterne: 'DV-FIN-1',
        prixVente: 10_000_000,
        statut: 'paiement_partiel',
      },
    });
    await prisma.paiement.createMany({
      data: [
        {
          dossierVenteId: vente.id,
          montant: 5_000_000,
          datePaiement: le15,
          mode: 'virement',
          reference: 'VIR-1',
          statut: 'valide',
        },
        {
          dossierVenteId: vente.id,
          montant: 2_000_000,
          datePaiement: le15,
          mode: 'especes',
          statut: 'en_attente',
        },
        {
          dossierVenteId: vente.id,
          montant: 1_000_000,
          datePaiement: le15,
          mode: 'especes',
          statut: 'annule',
        },
      ],
    });
    await prisma.commissionVente.create({
      data: {
        dossierVenteId: vente.id,
        commercialId: idSaisie,
        typeRegle: 'pourcentage',
        montantEstime: 300_000,
        montantValide: 300_000,
        montantPaye: 300_000,
        statut: 'payee',
        updatedAt: le15,
      },
    });
    await prisma.echeancePaiement.create({
      data: {
        dossierVenteId: vente.id,
        numero: 2,
        dateEcheance: new Date(Date.now() - 5 * 24 * 3600 * 1000),
        montantPrevu: 2_500_000,
        montantPaye: 500_000,
        statut: 'partielle',
      },
    });

    // --- Gérance : un bien à 8 %, un bien sans taux (défaut 10 %) ---
    const proprietaire = await data.seedProprietaire();
    const locataire = await prisma.locataire.create({
      data: { firstName: 'Awa', lastName: 'Sy' },
    });
    const bienA = await prisma.bienLocatif.create({
      data: {
        referenceInterne: 'BL-FIN-A',
        proprietaireId: proprietaire.id,
        type: 'appartement',
        adresse: 'Almadies',
        tauxGestion: 8,
      },
    });
    const bienB = await prisma.bienLocatif.create({
      data: {
        referenceInterne: 'BL-FIN-B',
        proprietaireId: proprietaire.id,
        type: 'studio',
        adresse: 'Mermoz',
      },
    });
    const bailA = await prisma.bailLocatif.create({
      data: {
        referenceInterne: 'B-FIN-A',
        bienLocatifId: bienA.id,
        locataireId: locataire.id,
        loyerMensuel: 150_000,
        dateDebut: new Date('2026-01-01T00:00:00Z'),
      },
    });
    const bailB = await prisma.bailLocatif.create({
      data: {
        referenceInterne: 'B-FIN-B',
        bienLocatifId: bienB.id,
        locataireId: locataire.id,
        loyerMensuel: 100_000,
        dateDebut: new Date('2026-01-01T00:00:00Z'),
      },
    });
    await prisma.paiementLoyer.createMany({
      data: [
        {
          bailLocatifId: bailA.id,
          type: 'normal',
          montant: 150_000,
          datePaiement: le15,
          modePaiement: 'virement',
          statut: 'valide',
        },
        {
          bailLocatifId: bailB.id,
          type: 'normal',
          montant: 100_000,
          datePaiement: le15,
          modePaiement: 'especes',
          statut: 'valide',
        },
        {
          bailLocatifId: bailB.id,
          type: 'normal',
          montant: 77_000,
          datePaiement: le15,
          modePaiement: 'especes',
          statut: 'en_attente',
        },
      ],
    });
    await prisma.echeanceLoyer.create({
      data: {
        bailLocatifId: bailB.id,
        periode: new Date(Date.UTC(2026, 8, 1)),
        dateEcheance: new Date(Date.now() - 20 * 24 * 3600 * 1000),
        montantPrevu: 100_000,
        montantPaye: 0,
        statut: 'impayee',
      },
    });

    // --- Démarches : 100 000 reçus, 1 500 de frais de transfert ---
    const mission = await prisma.missionVerification.create({
      data: {
        prospectId: prospect.id,
        typeVerification: 'verification_fonciere',
        referenceInterne: 'V-FIN-1',
        montantDevis: 150_000,
        montantPaye: 100_000,
      },
    });
    missionId = mission.id;
    await prisma.paiementMission.create({
      data: {
        missionId: mission.id,
        datePaiement: le15,
        montantEnvoye: 100_000,
        frais: 1_500,
        montantNet: 98_500,
        mode: 'mobile_money',
        reference: 'WAVE-1',
      },
    });

    // --- Construction : 400 000 dépensés (validé), 90 000 en attente ---
    const projet = await prisma.projetConstruction.create({
      data: {
        referenceInterne: 'CH-FIN-1',
        clientId: prospect.id,
        intitule: 'Villa test',
        typeProjet: 'villa',
      },
    });
    await prisma.depenseChantier.createMany({
      data: [
        {
          projetId: projet.id,
          libelle: 'Ciment',
          poste: 'gros_oeuvre',
          montant: 400_000,
          date: le15,
          statut: 'valide',
        },
        {
          projetId: projet.id,
          libelle: 'Sable',
          poste: 'gros_oeuvre',
          montant: 90_000,
          date: le15,
          statut: 'en_attente',
        },
      ],
    });

    tokenSaisie = await login('saisie@mtm.test');
    tokenControle = await login('controle@mtm.test');
    tokenAdmin = await login('admin@mtm.test');
    tokenLecteur = await login('lecteur@mtm.test');
    tokenSansDroit = await login('sans@mtm.test');
  });

  afterAll(async () => {
    await context.close();
  });

  // ------------------------------------------------------------------
  describe('droits', () => {
    it('refuse toute lecture sans la permission de consulter', async () => {
      for (const chemin of [
        '/finances/tableau',
        '/finances/journal',
        '/finances/operations',
        '/finances/clotures',
      ]) {
        expect((await api('get', chemin, tokenSansDroit)).status).toBe(403);
      }
      expect(
        (await request(app.getHttpServer()).get('/api/finances/tableau'))
          .status,
      ).toBe(401);
    });

    it('un lecteur consulte mais ne saisit, ne valide, n’exporte ni ne clôture rien', async () => {
      expect((await api('get', '/finances/tableau', tokenLecteur)).status).toBe(
        200,
      );
      expect(
        (
          await api('post', '/finances/operations', tokenLecteur).send(
            operation(),
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await api('post', '/finances/export', tokenLecteur).send({
            format: 'csv',
            justification: 'essai',
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await api('post', '/finances/clotures', tokenLecteur).send({
            periode,
          })
        ).status,
      ).toBe(403);
    });
  });

  // ------------------------------------------------------------------
  describe('journal et revenu de MTM', () => {
    it('reprend les mouvements validés de tous les modules, sans les paiements en attente ou annulés', async () => {
      const journal = await api(
        'get',
        `/finances/journal?du=${du}&au=${au}&pageSize=100`,
        tokenLecteur,
      );
      expect(journal.status).toBe(200);
      const natures = journal.body.items
        .map((l: { nature: string }) => l.nature)
        .sort();
      expect(natures).toEqual(
        [
          'commission_commercial',
          'depense_chantier',
          'encaissement_vente',
          'frais_operateur',
          'loyer',
          'loyer',
          'mission',
        ].sort(),
      );
      // Ni le paiement en attente, ni l'annulé, ni le loyer en attente, ni la dépense en attente.
      expect(journal.body.total).toBe(7);
      const vente = journal.body.items.find(
        (l: { nature: string }) => l.nature === 'encaissement_vente',
      );
      expect(vente).toMatchObject({
        activite: 'vente',
        sens: 'entree',
        montant: 5_000_000,
        revenu: 1_000_000,
        reference: 'VIR-1',
        tiers: 'Mame Ndiaye',
      });
    });

    it('sépare encaissements, revenu, dépenses et résultat par activité', async () => {
      const t = await tableau();
      const parActivite = Object.fromEntries(
        t.parActivite.map((a: { activite: string }) => [a.activite, a]),
      );
      // Vente : marge au prorata (5 M sur 10 M × 2 M), commission payée en charge.
      expect(parActivite.vente).toMatchObject({
        encaissements: 5_000_000,
        revenu: 1_000_000,
        depenses: 300_000,
        resultat: 700_000,
      });
      // Gérance : 8 % de 150 000 + 10 % (taux par défaut) de 100 000.
      expect(parActivite.locatif).toMatchObject({
        encaissements: 250_000,
        revenu: 22_000,
        depenses: 0,
      });
      // Démarches : 100 000 de prestation, 1 500 de frais de transfert.
      expect(parActivite.demarches).toMatchObject({
        encaissements: 100_000,
        revenu: 100_000,
        depenses: 1_500,
        resultat: 98_500,
      });
      expect(parActivite.construction).toMatchObject({
        encaissements: 0,
        revenu: 0,
        depenses: 400_000,
      });
      expect(t.totaux).toMatchObject({
        encaissements: 5_350_000,
        revenu: 1_122_000,
        depenses: 701_500,
        resultat: 420_500,
      });
      expect(t.tauxGestionDefaut).toBe(10);
      expect(t.margesInconnues).toBe(0);
    });

    it('la série mensuelle couvre chaque mois de la période', async () => {
      const t = await tableau();
      expect(t.serie).toHaveLength(1);
      expect(t.serie[0]).toMatchObject({
        periode,
        encaissements: 5_350_000,
        revenu: 1_122_000,
        depenses: 701_500,
      });
    });

    it('le taux de gestion par défaut se règle dans les paramètres', async () => {
      await context.data.seedSystemSetting({
        key: 'finances.tauxGestionDefaut',
        value: 5,
      });
      const t = await tableau();
      const locatif = t.parActivite.find(
        (a: { activite: string }) => a.activite === 'locatif',
      );
      // 8 % de 150 000 + 5 % de 100 000.
      expect(locatif.revenu).toBe(17_000);
      expect(t.tauxGestionDefaut).toBe(5);
      await context.data.seedSystemSetting({
        key: 'finances.tauxGestionDefaut',
        value: 10,
      });
    });

    it('filtre le journal et cherche dans les libellés et les tiers', async () => {
      const sorties = await api(
        'get',
        `/finances/journal?du=${du}&au=${au}&sens=sortie`,
        tokenLecteur,
      );
      expect(sorties.body.total).toBe(3);
      expect(sorties.body.totaux.depenses).toBe(701_500);
      const recherche = await api(
        'get',
        `/finances/journal?du=${du}&au=${au}&search=wave-1`,
        tokenLecteur,
      );
      expect(
        recherche.body.items.map((l: { nature: string }) => l.nature).sort(),
      ).toEqual(['frais_operateur', 'mission']);
      const locatif = await api(
        'get',
        `/finances/journal?du=${du}&au=${au}&activite=locatif`,
        tokenLecteur,
      );
      expect(locatif.body.total).toBe(2);
    });

    it('limite la période et refuse une période à l’envers', async () => {
      expect(
        (
          await api(
            'get',
            '/finances/journal?du=2024-01-01&au=2026-12-31',
            tokenLecteur,
          )
        ).status,
      ).toBe(400);
      expect(
        (await api('get', `/finances/journal?du=${au}&au=${du}`, tokenLecteur))
          .status,
      ).toBe(400);
    });

    it('signale ce qui reste à encaisser', async () => {
      const t = await tableau();
      expect(t.aEncaisser.loyers).toMatchObject({ total: 100_000, nombre: 1 });
      expect(t.aEncaisser.ventes).toMatchObject({
        total: 2_000_000,
        nombre: 1,
      });
      expect(t.aEncaisser.missions).toMatchObject({ total: 50_000, nombre: 1 });
      expect(t.aEncaisser.ventes.lignes[0].tiers).toBe('Mame Ndiaye');
    });
  });

  // ------------------------------------------------------------------
  describe('opérations saisies', () => {
    let operationId = '';

    it('une saisie n’entre pas dans les totaux tant qu’elle n’est pas validée', async () => {
      const creee = await api('post', '/finances/operations', tokenSaisie).send(
        operation(),
      );
      expect(creee.status).toBe(201);
      expect(creee.body).toMatchObject({
        statut: 'en_attente',
        montant: 200000,
        activite: 'general',
      });
      operationId = creee.body.id;
      expect((await tableau()).totaux.depenses).toBe(701_500);
      expect((await tableau()).operationsEnAttente).toBe(1);
      // Les valideurs sont prévenus.
      const alertes = await context.prisma.notification.findMany({
        where: { userId: idControle, type: 'operation_a_valider' },
      });
      expect(alertes).toHaveLength(1);
    });

    it('refuse une validation par l’auteur de la saisie', async () => {
      const donneeAdmin = await api(
        'post',
        '/finances/operations',
        tokenAdmin,
      ).send(
        operation({ libelle: 'Saisie de l’administrateur', montant: 1000 }),
      );
      const refus = await api(
        'post',
        `/finances/operations/${donneeAdmin.body.id}/valider`,
        tokenAdmin,
      );
      expect(refus.status).toBe(403);
      await api(
        'delete',
        `/finances/operations/${donneeAdmin.body.id}`,
        tokenAdmin,
      );
    });

    it('la validation par une autre personne l’ajoute aux totaux', async () => {
      const validee = await api(
        'post',
        `/finances/operations/${operationId}/valider`,
        tokenControle,
      );
      expect(validee.status).toBe(201);
      expect(validee.body).toMatchObject({ statut: 'validee' });
      const t = await tableau();
      const general = t.parActivite.find(
        (a: { activite: string }) => a.activite === 'general',
      );
      expect(general).toMatchObject({
        depenses: 200_000,
        revenu: 0,
        resultat: -200_000,
      });
      expect(t.totaux.depenses).toBe(901_500);
      expect(t.operationsEnAttente).toBe(0);
    });

    it('une recette saisie compte dans le revenu de son activité', async () => {
      const recette = await api(
        'post',
        '/finances/operations',
        tokenSaisie,
      ).send(
        operation({
          sens: 'recette',
          activite: 'construction',
          categorie: 'recette_chantier',
          libelle: 'Acompte client — villa',
          montant: 600000,
        }),
      );
      await api(
        'post',
        `/finances/operations/${recette.body.id}/valider`,
        tokenControle,
      );
      const t = await tableau();
      const construction = t.parActivite.find(
        (a: { activite: string }) => a.activite === 'construction',
      );
      expect(construction).toMatchObject({
        encaissements: 600_000,
        revenu: 600_000,
        depenses: 400_000,
        resultat: 200_000,
      });
    });

    it('une opération validée ne se modifie ni ne se supprime', async () => {
      expect(
        (
          await api(
            'patch',
            `/finances/operations/${operationId}`,
            tokenSaisie,
          ).send({ montant: 1 })
        ).status,
      ).toBe(409);
      expect(
        (
          await api(
            'delete',
            `/finances/operations/${operationId}`,
            tokenSaisie,
          )
        ).status,
      ).toBe(409);
      expect(
        (
          await api(
            'post',
            `/finances/operations/${operationId}/valider`,
            tokenControle,
          )
        ).status,
      ).toBe(409);
    });

    it('un rejet exige un motif, prévient l’auteur, et la correction repart en validation', async () => {
      const brouillon = await api(
        'post',
        '/finances/operations',
        tokenSaisie,
      ).send(
        operation({
          libelle: 'Facture sans justificatif',
          montant: 55000,
          categorie: 'fournitures',
        }),
      );
      const id = brouillon.body.id;
      expect(
        (
          await api(
            'post',
            `/finances/operations/${id}/rejeter`,
            tokenControle,
          ).send({ motif: '' })
        ).status,
      ).toBe(400);
      const rejet = await api(
        'post',
        `/finances/operations/${id}/rejeter`,
        tokenControle,
      ).send({
        motif: 'Justificatif manquant',
      });
      expect(rejet.body).toMatchObject({
        statut: 'rejetee',
        motifRejet: 'Justificatif manquant',
      });
      const chezAuteur = await context.prisma.notification.findMany({
        where: { userId: idSaisie, type: 'operation_rejetee' },
      });
      expect(chezAuteur).toHaveLength(1);
      expect(chezAuteur[0].message).toBe('Justificatif manquant');

      const corrigee = await api(
        'patch',
        `/finances/operations/${id}`,
        tokenSaisie,
      ).send({ montant: 56000 });
      expect(corrigee.body).toMatchObject({
        statut: 'en_attente',
        montant: 56000,
        motifRejet: null,
      });
      // Un autre collaborateur sans droit d'administration ne la modifie pas.
      expect(
        (
          await api('patch', `/finances/operations/${id}`, tokenControle).send({
            montant: 1,
          })
        ).status,
      ).toBe(403);
      expect(
        (await api('delete', `/finances/operations/${id}`, tokenSaisie)).status,
      ).toBe(204);
    });

    it('valide les données saisies', async () => {
      const post = (corps: Record<string, unknown>) =>
        api('post', '/finances/operations', tokenSaisie).send(operation(corps));
      expect((await post({ categorie: 'inconnue' })).status).toBe(400);
      expect(
        (await post({ sens: 'recette', categorie: 'loyer_bureaux' })).status,
      ).toBe(400);
      expect((await post({ montant: 0 })).status).toBe(400);
      expect((await post({ montant: 12.5 })).status).toBe(400);
      expect((await post({ activite: 'jardinage' })).status).toBe(400);
      expect(
        (
          await post({
            date: new Date(Date.now() + 10 * 86_400_000)
              .toISOString()
              .slice(0, 10),
          })
        ).status,
      ).toBe(400);
    });

    it('joint un justificatif, refuse un fichier dangereux', async () => {
      const creee = await api('post', '/finances/operations', tokenSaisie).send(
        operation({
          libelle: 'Avec pièce',
          montant: 12000,
          categorie: 'transport',
        }),
      );
      const id = creee.body.id;
      const ok = await api(
        'post',
        `/finances/operations/${id}/justificatif`,
        tokenSaisie,
      ).attach('file', Buffer.from(LOGO_PAR_DEFAUT_BASE64, 'base64'), {
        filename: 'recu.jpg',
        contentType: 'image/jpeg',
      });
      expect(ok.status).toBe(201);
      expect(ok.body.justificatifUrl).toContain('cloudinary.test');
      expect(ok.body.justificatifKey).toBeUndefined();
      const refus = await api(
        'post',
        `/finances/operations/${id}/justificatif`,
        tokenSaisie,
      ).attach('file', Buffer.from('MZ binaire'), {
        filename: 'virus.exe',
        contentType: 'application/x-msdownload',
      });
      expect(refus.status).toBe(400);
      expect(
        (
          await api(
            'post',
            `/finances/operations/${id}/justificatif`,
            tokenSaisie,
          )
        ).status,
      ).toBe(400);
      await api('delete', `/finances/operations/${id}`, tokenSaisie);
    });

    it('liste les opérations avec leurs auteurs, filtrées par statut', async () => {
      const validees = await api(
        'get',
        '/finances/operations?statut=validee',
        tokenLecteur,
      );
      expect(validees.body.total).toBe(2);
      expect(validees.body.items[0].validatedBy).toMatchObject({
        firstName: 'Cheikh',
      });
      expect(validees.body.items[0].createdBy).toMatchObject({
        firstName: 'Sophie',
      });
      const categories = await api('get', '/finances/categories', tokenLecteur);
      expect(categories.body.depenses).toContain('salaires');
      expect(categories.body.recettes).toContain('recette_chantier');
    });
  });

  // ------------------------------------------------------------------
  describe('export tracé', () => {
    it('exige un motif et la permission d’exporter', async () => {
      expect(
        (
          await api('post', '/finances/export', tokenControle).send({
            format: 'csv',
            du,
            au,
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await api('post', '/finances/export', tokenControle).send({
            format: 'pdf',
            du,
            au,
            justification: 'essai',
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await api('post', '/finances/export', tokenSaisie).send({
            format: 'csv',
            du,
            au,
            justification: 'essai',
          })
        ).status,
      ).toBe(403);
    });

    it('produit un CSV prêt pour Excel et le trace dans le journal d’audit', async () => {
      const reponse = await api('post', '/finances/export', tokenControle)
        .send({
          format: 'csv',
          du,
          au,
          justification: 'Envoi au cabinet comptable',
        })
        .buffer(true)
        .parse((res, done) => {
          const morceaux: Buffer[] = [];
          res.on('data', (m: Buffer) => morceaux.push(m));
          res.on('end', () => done(null, Buffer.concat(morceaux)));
        });
      expect(reponse.status).toBe(200);
      expect(reponse.headers['content-type']).toContain('text/csv');
      expect(reponse.headers['content-disposition']).toContain(
        `journal-financier_${du}_${au}.csv`,
      );
      const texte = (reponse.body as Buffer).toString('utf8');
      expect(texte.charCodeAt(0)).toBe(0xfeff);
      const lignes = texte.slice(1).trim().split('\r\n');
      expect(lignes[0]).toBe(
        'Date;Activité;Nature;Libellé;Tiers;Référence;Mode;Entrée;Sortie;Revenu MTM',
      );
      // 7 mouvements des modules + 3 opérations validées dont l'une est une recette de chantier.
      expect(lignes).toHaveLength(1 + 9);
      expect(
        lignes.some(
          (l) =>
            l.includes('Encaissement de vente') &&
            l.includes('5000000') &&
            l.includes('1000000'),
        ),
      ).toBe(true);
      const trace = await context.prisma.auditLog.findFirst({
        where: { action: 'finances.export', userId: idControle },
      });
      expect(trace?.justification).toBe('Envoi au cabinet comptable');
    });

    it('produit un classeur Excel avec journal, synthèse, mois et sommes dues', async () => {
      const reponse = await api('post', '/finances/export', tokenControle)
        .send({ format: 'xlsx', du, au, justification: 'Contrôle annuel' })
        .buffer(true)
        .parse((res, done) => {
          const morceaux: Buffer[] = [];
          res.on('data', (m: Buffer) => morceaux.push(m));
          res.on('end', () => done(null, Buffer.concat(morceaux)));
        });
      expect(reponse.status).toBe(200);
      expect(reponse.headers['content-type']).toContain('spreadsheetml');
      const octets = reponse.body as Buffer;
      // Un classeur .xlsx est une archive zip.
      expect(octets.subarray(0, 2).toString()).toBe('PK');
      expect(octets.length).toBeGreaterThan(3000);
    });
  });

  // ------------------------------------------------------------------
  describe('clôture mensuelle', () => {
    it('refuse le mois en cours et un mois mal écrit', async () => {
      const courant = `${maintenant.getUTCFullYear()}-${String(maintenant.getUTCMonth() + 1).padStart(2, '0')}`;
      expect(
        (
          await api('post', '/finances/clotures', tokenAdmin).send({
            periode: courant,
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await api('post', '/finances/clotures', tokenAdmin).send({
            periode: '2026-13',
          })
        ).status,
      ).toBe(400);
    });

    it('refuse de clôturer tant qu’une saisie du mois attend sa validation', async () => {
      const brouillon = await api(
        'post',
        '/finances/operations',
        tokenSaisie,
      ).send(
        operation({
          libelle: 'À valider avant clôture',
          montant: 5000,
          categorie: 'fournitures',
        }),
      );
      const refus = await api('post', '/finances/clotures', tokenAdmin).send({
        periode,
      });
      expect(refus.status).toBe(409);
      expect(refus.body.message).toContain('attendent encore leur validation');
      await api(
        'delete',
        `/finances/operations/${brouillon.body.id}`,
        tokenSaisie,
      );
    });

    it('fige les totaux du mois à la clôture', async () => {
      const cloture = await api('post', '/finances/clotures', tokenAdmin).send({
        periode,
      });
      expect(cloture.status).toBe(201);
      expect(cloture.body.resume.totaux).toMatchObject({
        encaissements: 5_950_000,
        revenu: 1_722_000,
        depenses: 901_500,
      });
      expect(cloture.body.resume.mouvements).toBe(9);
      expect(
        (await api('post', '/finances/clotures', tokenAdmin).send({ periode }))
          .status,
      ).toBe(409);
      const liste = await api('get', '/finances/clotures', tokenLecteur);
      const mois = liste.body.find(
        (m: { periode: string }) => m.periode === periode,
      );
      expect(mois).toMatchObject({ cloture: true, peutEtreCloture: false });
      expect(mois.par).toMatchObject({ firstName: 'Adama' });
    });

    it('plus aucune opération ne peut modifier un mois clôturé', async () => {
      // Saisie à une date du mois clôturé.
      const saisie = await api(
        'post',
        '/finances/operations',
        tokenSaisie,
      ).send(operation());
      expect(saisie.status).toBe(409);
      expect(saisie.body.message).toContain('clôturé');

      // Les modules refusent aussi : règlement de mission daté du mois clôturé…
      const paiements = app.get(DemarchesPaiementsService);
      const admin = { id: idAdmin, roles: ['administrateur'], permissions: [] };
      await expect(
        paiements.create(
          missionId,
          {
            datePaiement: ISO15,
            montantEnvoye: 10_000,
            mode: 'mobile_money',
          },
          admin as never,
        ),
      ).rejects.toThrow(/clôturé/);
      // … mais un règlement daté d'aujourd'hui passe.
      await expect(
        paiements.create(
          missionId,
          {
            montantEnvoye: 10_000,
            mode: 'mobile_money',
            reference: 'WAVE-AUJ',
          },
          admin as never,
        ),
      ).resolves.toBeDefined();

      const periodes = app.get(PeriodesFinancieresService);
      await expect(periodes.assertOuverte(le15)).rejects.toThrow(/clôturé/);
      await expect(periodes.assertOuverte(new Date())).resolves.toBeUndefined();
    });

    it('le mois clôturé garde ses chiffres même si une donnée change ensuite', async () => {
      const liste = await api('get', '/finances/clotures', tokenLecteur);
      const mois = liste.body.find(
        (m: { periode: string }) => m.periode === periode,
      );
      expect(mois.resume.totaux.revenu).toBe(1_722_000);
    });

    it('rouvrir un mois exige un motif et la permission d’administrer, et est tracé', async () => {
      expect(
        (
          await api(
            'delete',
            `/finances/clotures/${periode}`,
            tokenControle,
          ).send({ justification: 'x y z' })
        ).status,
      ).toBe(403);
      expect(
        (
          await api('delete', `/finances/clotures/${periode}`, tokenAdmin).send(
            {},
          )
        ).status,
      ).toBe(400);
      const ok = await api(
        'delete',
        `/finances/clotures/${periode}`,
        tokenAdmin,
      ).send({
        justification: 'Facture fournisseur oubliée',
      });
      expect(ok.status).toBe(204);
      expect(
        (
          await api('delete', `/finances/clotures/${periode}`, tokenAdmin).send(
            { justification: 'deuxième fois' },
          )
        ).status,
      ).toBe(404);
      const trace = await context.prisma.auditLog.findFirst({
        where: { action: 'finances.mois_rouvert' },
      });
      expect(trace?.justification).toBe('Facture fournisseur oubliée');
      // Le mois rouvert accepte de nouveau les saisies.
      const saisie = await api(
        'post',
        '/finances/operations',
        tokenSaisie,
      ).send(operation({ libelle: 'Après réouverture', montant: 1000 }));
      expect(saisie.status).toBe(201);
    });
  });
});
