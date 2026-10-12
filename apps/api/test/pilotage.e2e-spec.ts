// Plusieurs comptes se connectent à la suite : on relève la limite de connexions.
process.env.LOGIN_RATE_LIMIT_MAX = '100';

import { INestApplication } from '@nestjs/common';
import ExcelJS from 'exceljs';
import request from 'supertest';
import { createE2eApp, type E2eContext } from './helpers/e2e-app';
import { describeE2e } from './helpers/e2e-database';

/**
 * J3.2 — tableaux de bord direction, manager et commercial, dossiers
 * bloqués, rapports aperçus et exportés en PDF et en Excel.
 */
describeE2e('Pilotage : tableaux de bord et rapports (e2e)', () => {
  let app: INestApplication;
  let context: E2eContext;
  let tokenA: string;
  let tokenB: string;
  let tokenManager: string;
  let tokenDirection: string;
  let tokenLecteur: string;
  let tokenSansDroit: string;
  let idA = '';
  let idB = '';
  let terrainT1 = '';
  let prospectP1 = '';

  const PASSWORD = 'MotDePasse-Solide-2026';
  const JOUR = 24 * 3600 * 1000;
  const maintenant = new Date();
  const debutMois = new Date(
    Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), 1),
  );
  const debutJour = new Date(
    Date.UTC(
      maintenant.getUTCFullYear(),
      maintenant.getUTCMonth(),
      maintenant.getUTCDate(),
    ),
  );
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  const du = iso(debutMois);
  const au = iso(maintenant);
  const periode = `du=${du}&au=${au}`;
  const periodeObjectif = du.slice(0, 7);
  const ilYa = (jours: number) => new Date(maintenant.getTime() - jours * JOUR);

  const login = async (email: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: PASSWORD });
    expect(response.status).toBe(201);
    return response.body.accessToken as string;
  };

  const api = (
    methode: 'get' | 'post' | 'put' | 'delete',
    chemin: string,
    token: string,
  ) =>
    request(app.getHttpServer())
      [methode](`/api${chemin}`)
      .set('Authorization', `Bearer ${token}`);

  const telecharger = (
    chemin: string,
    token: string,
    corps: Record<string, unknown>,
  ) =>
    api('post', chemin, token)
      .send(corps)
      .buffer(true)
      .parse((res, done) => {
        const morceaux: Buffer[] = [];
        res.on('data', (m: Buffer) => morceaux.push(m));
        res.on('end', () => done(null, Buffer.concat(morceaux)));
      });

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
    const { data, prisma } = context;

    // Réglage créé par le seed en production : ici, les valeurs d'origine.
    await data.seedSystemSetting({
      key: 'pilotage.seuilsBlocage',
      value: { vente: 15, mission: 10, chantier: 7, prospect: 14, tache: 3 },
    });
    const rolesCommerciaux = await data.seedRoleWithPermissions('commercial', [
      'crm:consulter',
      'ventes:consulter',
      'taches:consulter',
    ]);
    const roleManager = await data.seedRoleWithPermissions('manager', [
      'crm:consulter',
      'ventes:consulter',
      'taches:consulter',
      'rapports:consulter',
      'rapports:exporter',
      'settings:consulter',
      'settings:modifier',
      'settings:creer',
    ]);
    const roleDirection = await data.seedRoleWithPermissions('dir_pilotage', [
      'crm:consulter',
      'rapports:consulter',
      'rapports:exporter',
      'rapports:administrer',
    ]);
    const roleLecteur = await data.seedRoleWithPermissions('lecteur_rapports', [
      'rapports:consulter',
    ]);
    const roleSans = await data.seedRoleWithPermissions('stagiaire', [
      'contact:consulter',
    ]);
    const creer = async (
      email: string,
      prenom: string,
      nom: string,
      role: { id: string },
    ) => {
      const user = await data.seedUser({
        email,
        password: PASSWORD,
        firstName: prenom,
        lastName: nom,
      });
      await data.linkUserRole(user.id, role.id);
      return user.id;
    };
    idA = await creer('a@mtm.test', 'Awa', 'Diop', rolesCommerciaux);
    idB = await creer('b@mtm.test', 'Boubacar', 'Fall', rolesCommerciaux);
    await creer('m@mtm.test', 'Moussa', 'Ba', roleManager);
    await creer('d@mtm.test', 'Daba', 'Sene', roleDirection);
    await creer('l@mtm.test', 'Lamine', 'Gaye', roleLecteur);
    await creer('s@mtm.test', 'Seynabou', 'Ly', roleSans);

    // --- Biens ---
    const terrain = (champs: Record<string, unknown>) =>
      prisma.terrain.create({
        data: {
          nom: 'Terrain',
          statutJuridique: 'Titre foncier',
          niveauVerification: 'Vérifié',
          ...champs,
        } as never,
      });
    const t1 = await terrain({
      referenceInterne: 'TR-P-1',
      nom: 'Almadies 1',
      statutCommercial: 'Vendu',
      region: 'Dakar',
      commune: 'Almadies',
      superficie: 300,
      prixPublic: 12_000_000,
    });
    const t2 = await terrain({
      referenceInterne: 'TR-P-2',
      nom: 'Mbour 1',
      statutCommercial: 'Vendu',
      region: 'Thiès',
      commune: 'Mbour',
      superficie: 500,
      prixPublic: 8_000_000,
    });
    await terrain({
      referenceInterne: 'TR-P-3',
      nom: 'Dakar libre',
      statutCommercial: 'Disponible',
      region: 'Dakar',
      commune: 'Ngor',
      superficie: 250,
      prixPublic: 5_000_000,
    });
    await terrain({
      referenceInterne: 'TR-P-4',
      nom: 'Sans zone',
      statutCommercial: 'Réservé',
      prixPublic: 3_000_000,
    });
    terrainT1 = t1.id;

    // --- Prospects ---
    const prospect = (champs: Record<string, unknown>) =>
      prisma.prospect.create({ data: { nom: 'Client', ...champs } });
    const p1 = await prospect({
      nom: 'Ndiaye',
      prenom: 'Mame',
      statutPipeline: 'qualifie',
      commercialResponsableId: idA,
    });
    await prospect({
      nom: 'Sarr',
      prenom: 'Ibou',
      statutPipeline: 'vente',
      commercialResponsableId: idA,
    });
    await prospect({
      nom: 'Cissé',
      prenom: 'Ami',
      statutPipeline: 'nouveau',
      commercialResponsableId: idB,
    });
    const p4 = await prospect({
      nom: 'Oublié',
      prenom: 'Paul',
      statutPipeline: 'nouveau',
      commercialResponsableId: idB,
      updatedAt: ilYa(40),
    });
    prospectP1 = p1.id;
    void p4;

    // --- Ventes ---
    const vente = (champs: Record<string, unknown>) =>
      prisma.dossierVente.create({
        data: { prospectId: p1.id, ...champs },
      });
    await vente({
      commercialResponsableId: idA,
      statut: 'solde',
      dateVente: maintenant,
      prixVente: 10_000_000,
      terrainId: t1.id,
      referenceInterne: 'DV-P-1',
    });
    await vente({
      commercialResponsableId: idB,
      statut: 'solde',
      dateVente: maintenant,
      prixVente: 6_000_000,
      terrainId: t2.id,
      referenceInterne: 'DV-P-2',
    });
    await vente({
      commercialResponsableId: idA,
      statut: 'solde',
      dateVente: new Date(debutMois.getTime() - JOUR),
      prixVente: 4_000_000,
      terrainId: t1.id,
      referenceInterne: 'DV-P-3',
    });
    await vente({
      commercialResponsableId: idA,
      statut: 'en_cours',
      referenceInterne: 'DV-P-4',
    });
    await vente({
      commercialResponsableId: idB,
      statut: 'en_cours',
      referenceInterne: 'DV-P-5',
      updatedAt: ilYa(30),
    });
    const v6 = await vente({
      commercialResponsableId: idB,
      statut: 'en_cours',
      referenceInterne: 'DV-P-6',
      updatedAt: ilYa(30),
    });
    // Un paiement récent : ce dossier avance, il n'est pas « bloqué ».
    await prisma.paiement.create({
      data: {
        dossierVenteId: v6.id,
        montant: 500_000,
        mode: 'virement',
        statut: 'valide',
        datePaiement: maintenant,
      },
    });

    // --- CRM : relances, visites, commission ---
    await prisma.activiteCrm.create({
      data: {
        prospectId: p1.id,
        type: 'relance',
        titre: 'Rappeler',
        dateEcheance: debutJour,
        statut: 'a_faire',
      },
    });
    await prisma.activiteCrm.create({
      data: {
        prospectId: p1.id,
        type: 'appel',
        titre: 'Appel de fin de journée',
        dateEcheance: new Date(debutJour.getTime() + JOUR - 60_000),
        statut: 'a_faire',
      },
    });
    await prisma.activiteCrm.update({
      where: {
        id: (
          await prisma.activiteCrm.findFirstOrThrow({
            where: { titre: 'Rappeler' },
          })
        ).id,
      },
      data: { dateEcheance: new Date(debutJour.getTime() - JOUR) },
    });
    await prisma.visiteProspect.create({
      data: {
        prospectId: p1.id,
        terrainId: t1.id,
        statut: 'effectuee',
        dateConfirmee: maintenant,
        accompagnateurId: idA,
      },
    });
    await prisma.visiteProspect.create({
      data: {
        prospectId: p1.id,
        terrainId: t2.id,
        statut: 'programmee',
        dateConfirmee: new Date(debutJour.getTime() + 3 * JOUR),
        heure: '10:30',
        accompagnateurId: idA,
      },
    });
    const dossierA = await prisma.dossierVente.findFirstOrThrow({
      where: { referenceInterne: 'DV-P-4' },
    });
    await prisma.commissionVente.create({
      data: {
        dossierVenteId: dossierA.id,
        commercialId: idA,
        typeRegle: 'pourcentage',
        montantEstime: 100_000,
        statut: 'estimee',
      },
    });
    await prisma.objectifCommercial.create({
      data: {
        commercialId: idA,
        periode: periodeObjectif,
        cibleVentes: 4,
        cibleChiffreAffaires: 20_000_000,
      },
    });

    // --- Tâches et agenda ---
    await prisma.tache.create({
      data: {
        titre: 'Envoyer le contrat',
        responsableId: idA,
        creeParId: idA,
        dateLimite: ilYa(5),
        statut: 'a_faire',
      },
    });
    await prisma.tache.create({
      data: {
        titre: 'Appeler le notaire',
        responsableId: idB,
        creeParId: idB,
        dateLimite: ilYa(1),
        statut: 'a_faire',
      },
    });
    await prisma.evenementAgenda.create({
      data: {
        type: 'rendez_vous',
        titre: 'Signature',
        debut: new Date(debutJour.getTime() + 22 * 3600 * 1000),
        createurId: idA,
      },
    });

    // --- Locatif ---
    const proprietaire = await data.seedProprietaire();
    const locataire = await prisma.locataire.create({
      data: { firstName: 'Awa', lastName: 'Sy' },
    });
    const bien1 = await prisma.bienLocatif.create({
      data: {
        referenceInterne: 'BL-P-1',
        proprietaireId: proprietaire.id,
        type: 'appartement',
        adresse: 'Almadies',
        statut: 'loue',
      },
    });
    await prisma.bienLocatif.create({
      data: {
        referenceInterne: 'BL-P-2',
        proprietaireId: proprietaire.id,
        type: 'studio',
        adresse: 'Mermoz',
        statut: 'disponible',
      },
    });
    const bail = await prisma.bailLocatif.create({
      data: {
        referenceInterne: 'B-P-1',
        bienLocatifId: bien1.id,
        locataireId: locataire.id,
        loyerMensuel: 100_000,
        dateDebut: new Date('2026-01-01T00:00:00Z'),
      },
    });
    await prisma.echeanceLoyer.create({
      data: {
        bailLocatifId: bail.id,
        periode: debutMois,
        dateEcheance: debutMois,
        montantPrevu: 100_000,
        montantPaye: 100_000,
        statut: 'payee',
      },
    });
    await prisma.echeanceLoyer.create({
      data: {
        bailLocatifId: bail.id,
        periode: ilYa(40),
        dateEcheance: ilYa(40),
        montantPrevu: 100_000,
        montantPaye: 0,
        statut: 'en_retard',
      },
    });

    // --- Démarches ---
    await prisma.missionVerification.create({
      data: {
        prospectId: p1.id,
        typeVerification: 'verification_fonciere',
        referenceInterne: 'V-P-1',
        statut: 'demande',
      },
    });
    await prisma.missionVerification.create({
      data: {
        prospectId: p1.id,
        typeVerification: 'verification_fonciere',
        referenceInterne: 'V-P-2',
        statut: 'faisabilite',
        updatedAt: ilYa(20),
      },
    });
    await prisma.missionVerification.create({
      data: {
        prospectId: p1.id,
        typeVerification: 'depot_mutation',
        referenceInterne: 'V-P-3',
        statut: 'cloturee',
        decision: 'favorable',
        dateDemande: debutMois,
        dateRapport: debutMois,
      },
    });

    // --- Chantier ---
    await prisma.projetConstruction.create({
      data: {
        referenceInterne: 'CH-P-1',
        clientId: p1.id,
        intitule: 'Villa Almadies',
        typeProjet: 'villa',
        statut: 'en_cours',
        avancement: 40,
        situationAlerte: 'retard',
        updatedAt: ilYa(20),
      },
    });

    tokenA = await login('a@mtm.test');
    tokenB = await login('b@mtm.test');
    tokenManager = await login('m@mtm.test');
    tokenDirection = await login('d@mtm.test');
    tokenLecteur = await login('l@mtm.test');
    tokenSansDroit = await login('s@mtm.test');
  });

  afterAll(async () => {
    await context.close();
  });

  // ------------------------------------------------------------------
  describe('droits', () => {
    it('chaque tableau a sa permission', async () => {
      expect(
        (await api('get', '/pilotage/direction', tokenManager)).status,
      ).toBe(403);
      expect((await api('get', '/pilotage/manager', tokenA)).status).toBe(403);
      expect(
        (await api('get', '/pilotage/dossiers-bloques', tokenA)).status,
      ).toBe(403);
      expect((await api('get', '/pilotage/rapports', tokenA)).status).toBe(403);
      expect(
        (await api('get', '/pilotage/commercial', tokenSansDroit)).status,
      ).toBe(403);
      expect(
        (await request(app.getHttpServer()).get('/api/pilotage/manager'))
          .status,
      ).toBe(401);
      expect(
        (await api('get', '/pilotage/direction', tokenDirection)).status,
      ).toBe(200);
      expect((await api('get', '/pilotage/manager', tokenManager)).status).toBe(
        200,
      );
      expect((await api('get', '/pilotage/commercial', tokenA)).status).toBe(
        200,
      );
    });

    it('un commercial ne consulte pas le tableau d’un collègue, l’encadrement le peut', async () => {
      expect(
        (await api('get', `/pilotage/commercial?commercialId=${idB}`, tokenA))
          .status,
      ).toBe(403);
      const vu = await api(
        'get',
        `/pilotage/commercial?commercialId=${idA}`,
        tokenManager,
      );
      expect(vu.status).toBe(200);
      expect(vu.body.commercial.nom).toBe('Awa Diop');
    });
  });

  // ------------------------------------------------------------------
  describe('tableau de bord direction', () => {
    it('chiffre les ventes de la période et les compare à la précédente', async () => {
      const r = await api(
        'get',
        `/pilotage/direction?${periode}`,
        tokenDirection,
      );
      expect(r.status).toBe(200);
      expect(r.body.ventes).toMatchObject({
        soldees: 2,
        soldeesPrecedent: 1,
        variation: 100,
        chiffreAffaires: 16_000_000,
        chiffreAffairesPrecedent: 4_000_000,
        variationCa: 300,
        enCours: 3,
        prospectsCrees: 4,
      });
    });

    it('classe les commerciaux par chiffre d’affaires', async () => {
      const r = await api(
        'get',
        `/pilotage/direction?${periode}`,
        tokenDirection,
      );
      expect(r.body.performances).toEqual([
        expect.objectContaining({
          rang: 1,
          nom: 'Awa Diop',
          ventes: 1,
          ca: 10_000_000,
        }),
        expect.objectContaining({
          rang: 2,
          nom: 'Boubacar Fall',
          ventes: 1,
          ca: 6_000_000,
        }),
      ]);
    });

    it('mesure l’occupation, le recouvrement des loyers, les démarches et les chantiers', async () => {
      const r = await api(
        'get',
        `/pilotage/direction?${periode}`,
        tokenDirection,
      );
      expect(r.body.locatif).toMatchObject({
        biens: 2,
        loues: 1,
        tauxOccupation: 50,
        loyersAttendus: 100_000,
        loyersEncaisses: 100_000,
        tauxRecouvrement: 100,
        impayesProlonges: 1,
      });
      expect(r.body.demarches).toMatchObject({
        ouvertes: 3,
        actives: 2,
        rapportsRendus: 1,
        parDecision: { favorable: 1 },
      });
      expect(r.body.construction).toMatchObject({
        actifs: 1,
        enAlerte: 1,
        avancementMoyen: 40,
      });
    });

    it('remonte les alertes et les tendances sur douze mois', async () => {
      const r = await api(
        'get',
        `/pilotage/direction?${periode}`,
        tokenDirection,
      );
      expect(r.body.alertes).toMatchObject({
        dossiersBloques: 5,
        impayesProlonges: 1,
        chantiersEnAlerte: 1,
        commissionsAValider: 1,
        mandatsExpirant30Jours: 0,
      });
      expect(r.body.tendances.ventes).toHaveLength(12);
      const derniers = r.body.tendances.ventes
        .slice(-2)
        .map((p: { valeur: number }) => p.valeur);
      expect(derniers).toEqual([1, 2]);
      expect(r.body.tendances.chiffreAffaires.at(-1).valeur).toBe(16_000_000);
      expect(r.body.tendances.finances).toHaveLength(12);
    });

    it('refuse une période absurde', async () => {
      expect(
        (
          await api(
            'get',
            '/pilotage/direction?du=2020-01-01&au=2026-12-31',
            tokenDirection,
          )
        ).status,
      ).toBe(400);
    });
  });

  // ------------------------------------------------------------------
  describe('tableau de bord manager', () => {
    it('détaille l’activité de chaque commercial', async () => {
      const r = await api('get', `/pilotage/manager?${periode}`, tokenManager);
      expect(r.status).toBe(200);
      const parNom = Object.fromEntries(
        r.body.equipe.map((l: { nom: string }) => [l.nom, l]),
      );
      expect(parNom['Awa Diop']).toMatchObject({
        prospectsActifs: 1,
        relancesEnRetard: 1,
        visitesEffectuees: 1,
        ventesSoldees: 1,
        chiffreAffaires: 10_000_000,
        commissionsEstimees: 100_000,
        tachesEnRetard: 1,
      });
      expect(parNom['Boubacar Fall']).toMatchObject({
        prospectsActifs: 2,
        relancesEnRetard: 0,
        ventesSoldees: 1,
        chiffreAffaires: 6_000_000,
        tachesEnRetard: 1,
        objectif: null,
      });
    });

    it('mesure l’atteinte des objectifs et totalise l’équipe', async () => {
      const r = await api('get', `/pilotage/manager?${periode}`, tokenManager);
      const awa = r.body.equipe.find(
        (l: { nom: string }) => l.nom === 'Awa Diop',
      );
      expect(awa.objectif).toMatchObject({
        cibleVentes: 4,
        cibleChiffreAffaires: 20_000_000,
      });
      expect(awa.taux.ventes).toBe(50);
      expect(r.body.objectifs).toMatchObject({
        avecObjectif: 1,
        cibleVentes: 4,
      });
      expect(r.body.totaux).toMatchObject({
        prospectsActifs: 3,
        relancesEnRetard: 1,
        ventesSoldees: 2,
        chiffreAffaires: 16_000_000,
        tachesEnRetard: 2,
      });
    });

    it('liste les dossiers bloqués, sans signaler ce qui avance par ses pièces', async () => {
      const r = await api('get', `/pilotage/dossiers-bloques`, tokenManager);
      expect(r.body.total).toBe(5);
      const groupes = Object.fromEntries(
        r.body.groupes.map((g: { type: string }) => [g.type, g]),
      );
      expect(groupes.vente.total).toBe(1);
      expect(groupes.vente.dossiers[0]).toMatchObject({
        libelle: 'Dossier DV-P-5',
        lien: expect.stringContaining('/ventes/'),
      });
      expect(groupes.vente.dossiers[0].jours).toBeGreaterThanOrEqual(30);
      expect(groupes.mission.total).toBe(1);
      expect(groupes.chantier.total).toBe(1);
      expect(groupes.prospect.total).toBe(1);
      expect(groupes.prospect.dossiers[0].libelle).toBe('Paul Oublié');
      expect(groupes.tache.total).toBe(1);
      expect(groupes.tache.dossiers[0].responsable).toBe('Awa Diop');
      expect(r.body.seuils).toMatchObject({
        vente: 15,
        mission: 10,
        chantier: 7,
        prospect: 14,
        tache: 3,
      });
    });

    it('les délais se règlent dans Paramètres, et sont contrôlés', async () => {
      expect(
        (
          await api(
            'put',
            '/settings/pilotage.seuilsBlocage',
            tokenManager,
          ).send({
            value: { vente: 'dix' },
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await api(
            'put',
            '/settings/pilotage.seuilsBlocage',
            tokenManager,
          ).send({
            value: { vente: 0 },
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await api(
            'put',
            '/settings/pilotage.seuilsBlocage',
            tokenManager,
          ).send({
            value: { inconnu: 5 },
          })
        ).status,
      ).toBe(400);
      const ok = await api(
        'put',
        '/settings/pilotage.seuilsBlocage',
        tokenManager,
      ).send({
        value: { vente: 60 },
        description: 'Délais de blocage',
      });
      expect(ok.status).toBe(200);
      const r = await api('get', `/pilotage/dossiers-bloques`, tokenManager);
      expect(r.body.seuils.vente).toBe(60);
      expect(r.body.seuils.mission).toBe(10);
      expect(r.body.total).toBe(4);
    });
  });

  // ------------------------------------------------------------------
  describe('tableau de bord commercial', () => {
    it('montre le pipeline, les relances, les visites et les ventes du commercial', async () => {
      const r = await api('get', '/pilotage/commercial', tokenA);
      expect(r.body.commercial.nom).toBe('Awa Diop');
      expect(r.body.pipeline).toEqual({ qualifie: 1, vente: 1 });
      expect(r.body.prospectsActifs).toBe(1);
      expect(r.body.relances).toMatchObject({ enRetard: 1, aujourdhui: 1 });
      expect(r.body.relances.prochaines[0]).toMatchObject({
        titre: 'Rappeler',
        enRetard: true,
        prospect: 'Mame Ndiaye',
      });
      expect(r.body.visites.effectueesCeMois).toBe(1);
      expect(r.body.visites.aVenir).toHaveLength(1);
      expect(r.body.visites.aVenir[0]).toMatchObject({
        heure: '10:30',
        bien: 'TR-P-2 — Mbour 1',
      });
      expect(r.body.ventes).toMatchObject({
        ouvertes: 1,
        soldeesCeMois: 1,
        chiffreAffairesCeMois: 10_000_000,
      });
      expect(r.body.ventes.parStatut).toMatchObject({ solde: 2, en_cours: 1 });
    });

    it('chiffre l’objectif, les commissions, les tâches et l’agenda du jour', async () => {
      const r = await api('get', '/pilotage/commercial', tokenA);
      expect(r.body.objectif.cibles).toMatchObject({ cibleVentes: 4 });
      expect(r.body.objectif.taux.ventes).toBe(50);
      expect(r.body.commissions).toMatchObject({
        estimees: 100_000,
        aPayer: 0,
        payeesCetteAnnee: 0,
      });
      expect(r.body.taches).toMatchObject({ ouvertes: 1, enRetard: 1 });
      expect(r.body.agenda.map((e: { titre: string }) => e.titre)).toEqual([
        'Signature',
      ]);
    });

    it('chaque commercial ne voit que ses propres chiffres', async () => {
      const b = await api('get', '/pilotage/commercial', tokenB);
      expect(b.body.commercial.nom).toBe('Boubacar Fall');
      expect(b.body.pipeline).toEqual({ nouveau: 2 });
      expect(b.body.relances).toMatchObject({ enRetard: 0, aujourdhui: 0 });
      expect(b.body.ventes.soldeesCeMois).toBe(1);
      expect(b.body.commissions.estimees).toBe(0);
    });
  });

  // ------------------------------------------------------------------
  describe('rapports', () => {
    it('liste le catalogue', async () => {
      const r = await api('get', '/pilotage/rapports', tokenLecteur);
      expect(r.body.map((x: { code: string }) => x.code)).toEqual([
        'ventes_periode',
        'ventes_zone',
        'performance_commerciaux',
        'terrains_etat',
        'loyers_impayes',
        'rentabilite_activite',
        'activite_demarches',
      ]);
      expect(
        (await api('get', '/pilotage/rapports/inconnu', tokenLecteur)).status,
      ).toBe(404);
    });

    const rapport = async (code: string, extra = '') =>
      (
        await api(
          'get',
          `/pilotage/rapports/${code}?${periode}${extra}`,
          tokenLecteur,
        )
      ).body;
    const section = (
      r: { sections: Array<{ titre: string }> },
      debut: string,
    ) =>
      r.sections.find((s) => s.titre.startsWith(debut)) as unknown as {
        lignes: Array<Record<string, unknown>>;
        total?: Record<string, unknown>;
      };

    it('ventes par période : le détail, le total et le filtre par région', async () => {
      const r = await rapport('ventes_periode');
      expect(r.resume.map((x: { libelle: string }) => x.libelle)).toEqual([
        'Ventes conclues',
        'Chiffre d’affaires',
        'Prix moyen',
      ]);
      const ventes = section(r, 'Ventes conclues');
      expect(ventes.lignes).toHaveLength(2);
      expect(ventes.total).toMatchObject({ prix: 16_000_000 });
      expect(ventes.lignes[0]).toMatchObject({
        reference: 'DV-P-1',
        client: 'Mame Ndiaye',
        zone: 'Dakar · Almadies',
        commercial: 'Awa Diop',
      });
      expect(section(r, 'Par mois').lignes).toEqual([
        { mois: periodeObjectif, ventes: 2, ca: 16_000_000 },
      ]);

      const dakar = await rapport('ventes_periode', '&region=dakar');
      expect(section(dakar, 'Ventes conclues').lignes).toHaveLength(1);
      expect(dakar.sousTitre).toContain('Région : dakar');
      expect(
        (
          await api(
            'get',
            `/pilotage/rapports/loyers_impayes?${periode}&region=Dakar`,
            tokenLecteur,
          )
        ).status,
      ).toBe(400);
    });

    it('ventes par zone : regroupe par région et par commune', async () => {
      const r = await rapport('ventes_zone');
      const regions = section(r, 'Par région');
      expect(regions.lignes).toEqual([
        expect.objectContaining({
          zone: 'Dakar',
          ventes: 1,
          ca: 10_000_000,
          prixMoyen: 10_000_000,
          superficie: 300,
        }),
        expect.objectContaining({
          zone: 'Thiès',
          ventes: 1,
          ca: 6_000_000,
          superficie: 500,
        }),
      ]);
      expect(section(r, 'Par commune').lignes.map((l) => l.zone)).toEqual([
        'Dakar · Almadies',
        'Thiès · Mbour',
      ]);
    });

    it('performance des commerciaux : prospects, visites, ventes, objectifs', async () => {
      const r = await rapport('performance_commerciaux');
      const lignes = section(r, 'Résultats').lignes;
      expect(lignes[0]).toMatchObject({
        commercial: 'Awa Diop',
        prospects: 2,
        visites: 1,
        ventes: 1,
        ca: 10_000_000,
        commissions: 100_000,
        cibleVentes: 4,
        atteinte: 25,
      });
      expect(lignes[1]).toMatchObject({
        commercial: 'Boubacar Fall',
        ventes: 1,
        cibleVentes: null,
        atteinte: null,
      });
    });

    it('terrains disponibles et vendus : par statut et par zone', async () => {
      const r = await rapport('terrains_etat');
      expect(r.periode).toBeNull();
      expect(r.resume.map((x: { valeur: string }) => x.valeur)[0]).toBe('4');
      const statuts = section(r, 'Par statut').lignes.map((l) => [
        l.statut,
        l.biens,
      ]);
      expect(statuts).toEqual(
        expect.arrayContaining([
          ['Vendu', 2],
          ['Disponible', 1],
          ['Réservé', 1],
        ]),
      );
      expect(section(r, 'Biens disponibles').lignes).toEqual([
        expect.objectContaining({
          reference: 'TR-P-3',
          zone: 'Dakar · Ngor',
          prix: 5_000_000,
        }),
      ]);
      const zones = section(r, 'Par région').lignes.find(
        (l) => l.zone === 'Non renseignée',
      );
      expect(zones).toMatchObject({ autres: 1 });
    });

    it('loyers et impayés : attendu, encaissé, recouvrement et retards', async () => {
      const r = await rapport('loyers_impayes');
      const parBien = section(r, 'Loyers par bien');
      expect(parBien.lignes).toEqual([
        expect.objectContaining({
          bien: 'BL-P-1',
          attendu: 100_000,
          encaisse: 100_000,
          reste: 0,
          taux: 100,
        }),
      ]);
      const impayes = section(r, 'Impayés');
      expect(impayes.lignes).toHaveLength(1);
      expect(impayes.lignes[0]).toMatchObject({
        bail: 'B-P-1',
        locataire: 'Awa Sy',
        reste: 100_000,
        retard: 40,
      });
      expect(impayes.total).toMatchObject({ reste: 100_000 });
    });

    it('rentabilité par activité : une ligne par activité et un total', async () => {
      const r = await rapport('rentabilite_activite');
      const activites = section(r, 'Par activité');
      expect(activites.lignes.map((l) => l.activite)).toEqual([
        'Vente de biens',
        'Gestion locative',
        'Démarches et vérifications',
        'Construction',
        'Général (hors activité)',
      ]);
      expect(activites.total).toMatchObject({
        encaissements: 500_000,
        revenu: expect.any(Number),
      });
      expect(section(r, 'Par mois').lignes).toHaveLength(1);
    });

    it('activité des démarches : missions, rapports rendus, décisions, délais', async () => {
      const r = await rapport('activite_demarches');
      expect(r.resume[0]).toMatchObject({
        libelle: 'Missions ouvertes',
        valeur: '3',
      });
      expect(r.resume[1]).toMatchObject({
        libelle: 'Rapports rendus',
        valeur: '1',
      });
      expect(r.resume[2]).toMatchObject({ valeur: '0 jours' });
      expect(section(r, 'Décisions').lignes).toEqual([
        { decision: 'favorable', missions: 1 },
      ]);
      expect(section(r, 'Par type').total).toMatchObject({
        ouvertes: 3,
        rapports: 1,
      });
    });
  });

  // ------------------------------------------------------------------
  describe('export des rapports', () => {
    it('exige un motif, un format connu et la permission d’exporter', async () => {
      expect(
        (
          await api(
            'post',
            '/pilotage/rapports/ventes_periode/export',
            tokenManager,
          ).send({ format: 'pdf', du, au })
        ).status,
      ).toBe(400);
      expect(
        (
          await api(
            'post',
            '/pilotage/rapports/ventes_periode/export',
            tokenManager,
          ).send({ format: 'csv', du, au, justification: 'essai' })
        ).status,
      ).toBe(400);
      expect(
        (
          await api(
            'post',
            '/pilotage/rapports/ventes_periode/export',
            tokenLecteur,
          ).send({ format: 'pdf', du, au, justification: 'essai' })
        ).status,
      ).toBe(403);
      expect(
        (
          await api(
            'post',
            '/pilotage/rapports/inconnu/export',
            tokenManager,
          ).send({ format: 'pdf', du, au, justification: 'essai' })
        ).status,
      ).toBe(404);
    });

    it('produit un PDF avec le logo et les mentions de MTM, et le trace', async () => {
      const reponse = await telecharger(
        '/pilotage/rapports/ventes_periode/export',
        tokenManager,
        {
          format: 'pdf',
          du,
          au,
          justification: 'Comité de direction du lundi',
        },
      );
      expect(reponse.status).toBe(200);
      expect(reponse.headers['content-type']).toContain('application/pdf');
      expect(reponse.headers['content-disposition']).toContain(
        `ventes-par-periode_${du}_${au}.pdf`,
      );
      const pdf = reponse.body as Buffer;
      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
      const texte = pdf.toString('latin1');
      expect(texte).toContain('/Subtype /Image');
      expect(texte).toContain('DV-P-1');
      expect(texte).toContain('page 1/1');
      const trace = await context.prisma.auditLog.findFirst({
        where: { action: 'rapport.export', entityId: 'ventes_periode' },
      });
      expect(trace?.justification).toBe('Comité de direction du lundi');
    });

    it('produit un classeur Excel avec de vrais nombres et un onglet par tableau', async () => {
      const reponse = await telecharger(
        '/pilotage/rapports/ventes_periode/export',
        tokenManager,
        {
          format: 'xlsx',
          du,
          au,
          justification: 'Contrôle',
        },
      );
      expect(reponse.status).toBe(200);
      const classeur = new ExcelJS.Workbook();
      await classeur.xlsx.load(reponse.body);
      expect(classeur.worksheets.map((f) => f.name)).toEqual([
        'Synthèse',
        'Ventes conclues',
        'Par mois',
      ]);
      const ventes = classeur.getWorksheet('Ventes conclues')!;
      expect(ventes.getRow(1).getCell(1).value).toBe('Date');
      // Le prix est un nombre, pas un texte : le comptable peut le totaliser.
      expect(typeof ventes.getRow(2).getCell(7).value).toBe('number');
      expect(ventes.getRow(2).getCell(7).value).toBe(10_000_000);
      expect(ventes.getRow(2).getCell(1).value).toBeInstanceOf(Date);
      expect(ventes.getRow(4).getCell(7).value).toBe(16_000_000);
    });

    it('chaque rapport s’exporte dans les deux formats', async () => {
      for (const code of [
        'ventes_zone',
        'performance_commerciaux',
        'terrains_etat',
        'loyers_impayes',
        'rentabilite_activite',
        'activite_demarches',
      ]) {
        for (const format of ['pdf', 'xlsx']) {
          const r = await telecharger(
            `/pilotage/rapports/${code}/export`,
            tokenManager,
            { format, du, au, justification: 'Contrôle complet' },
          );
          expect(r.status).toBe(200);
          expect((r.body as Buffer).length).toBeGreaterThan(1500);
        }
      }
    });

    it('un long rapport passe sur plusieurs pages, avec la ligne de titres reprise', async () => {
      await context.prisma.dossierVente.createMany({
        data: Array.from({ length: 120 }, (_, i) => ({
          prospectId: prospectP1,
          terrainId: terrainT1,
          commercialResponsableId: idA,
          statut: 'solde',
          dateVente: maintenant,
          prixVente: 1_000_000,
          referenceInterne: `DV-LONG-${i}`,
        })),
      });
      const reponse = await telecharger(
        '/pilotage/rapports/ventes_periode/export',
        tokenManager,
        {
          format: 'pdf',
          du,
          au,
          justification: 'Long rapport',
        },
      );
      const texte = (reponse.body as Buffer).toString('latin1');
      const pages = texte.match(/\/Type \/Page /g) ?? [];
      expect(pages.length).toBeGreaterThanOrEqual(3);
      expect(texte).toContain(`page 1/${pages.length}`);
      expect(texte).toContain(`page ${pages.length}/${pages.length}`);
      // La dernière ligne de la liste est bien imprimée.
      expect(texte).toContain('DV-LONG-119');
    });
  });
});
