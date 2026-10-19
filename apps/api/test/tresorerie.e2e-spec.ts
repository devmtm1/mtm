// Plusieurs comptes se connectent à la suite : on relève la limite de connexions.
process.env.LOGIN_RATE_LIMIT_MAX = '100';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2eApp, type E2eContext } from './helpers/e2e-app';
import { describeE2e } from './helpers/e2e-database';
import { LOGO_PAR_DEFAUT_BASE64 } from '../src/common/pdf/logo-defaut';

/**
 * Cahier des charges du DG : seuils de validation, corrections traçables,
 * comptes et soldes, remises de fonds, clôture de caisse, reversements aux
 * propriétaires, désistements, chantiers, tableau de bord et rapport du soir.
 */
describeE2e('Trésorerie et contrôle financier (e2e)', () => {
  let app: INestApplication;
  let context: E2eContext;
  let tokenSaisie: string;
  let tokenCompta: string;
  let tokenDg: string;
  let tokenDelegue: string;
  let tokenLecteur: string;
  let idDelegue = '';

  const PASSWORD = 'MotDePasse-Solide-2026';
  const aujourdhui = new Date().toISOString().slice(0, 10);

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

  const piece = (
    chemin: string,
    token: string,
  ): ReturnType<typeof request.agent> extends never ? never : request.Test =>
    api('post', chemin, token).attach(
      'file',
      Buffer.from(LOGO_PAR_DEFAUT_BASE64, 'base64'),
      { filename: 'recu.jpg', contentType: 'image/jpeg' },
    );

  const depense = (montant: number, extra: Record<string, unknown> = {}) => ({
    sens: 'depense',
    activite: 'general',
    categorie: 'transport',
    libelle: `Dépense de ${montant}`,
    montant,
    date: aujourdhui,
    modePaiement: 'especes',
    ...extra,
  });

  const saisir = async (
    token: string,
    montant: number,
    extra: Record<string, unknown> = {},
  ) => {
    const reponse = await api('post', '/finances/operations', token).send(
      depense(montant, extra),
    );
    expect(reponse.status).toBe(201);
    return reponse.body as { id: string; niveauValidation: number };
  };

  const reglage = async (key: string, value: unknown) =>
    context.prisma.systemSetting.upsert({
      where: { key },
      update: { value: value as never },
      create: { key, value: value as never },
    });

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
    const { data } = context;

    const roleSaisie = await data.seedRoleWithPermissions('saisie_tresorerie', [
      'finances:consulter',
      'finances:creer',
      'finances:modifier',
    ]);
    const roleCompta = await data.seedRoleWithPermissions('compta_tresorerie', [
      'finances:consulter',
      'finances:creer',
      'finances:modifier',
      'finances:valider',
      'finances:exporter',
      'finances:payer',
    ]);
    const roleDg = await data.seedRoleWithPermissions('dg_tresorerie', [
      'finances:consulter',
      'finances:creer',
      'finances:modifier',
      'finances:valider',
      'finances:exporter',
      'finances:administrer',
      'finances:autoriser',
      'finances:payer',
    ]);
    const roleDelegue = await data.seedRoleWithPermissions(
      'delegue_tresorerie',
      ['finances:consulter', 'finances:valider'],
    );
    const roleLecteur = await data.seedRoleWithPermissions(
      'lecteur_tresorerie',
      ['finances:consulter'],
    );
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
    await creer('saisie@tresorerie.test', 'Sophie', roleSaisie);
    await creer('compta@tresorerie.test', 'Cheikh', roleCompta);
    await creer('dg@tresorerie.test', 'Adama', roleDg);
    idDelegue = await creer('delegue@tresorerie.test', 'Moussa', roleDelegue);
    await creer('lecteur@tresorerie.test', 'Lamine', roleLecteur);

    tokenSaisie = await login('saisie@tresorerie.test');
    tokenCompta = await login('compta@tresorerie.test');
    tokenDg = await login('dg@tresorerie.test');
    tokenDelegue = await login('delegue@tresorerie.test');
    tokenLecteur = await login('lecteur@tresorerie.test');
  });

  afterAll(async () => {
    await context.close();
  });

  // ------------------------------------------------------------------
  describe('seuils de validation des dépenses', () => {
    it('sous 50 000 FCFA la comptable valide seule, mais avec la pièce justificative', async () => {
      const petite = await saisir(tokenSaisie, 30_000);
      expect(petite.niveauValidation).toBe(0);

      const sansPiece = await api(
        'post',
        `/finances/operations/${petite.id}/valider`,
        tokenCompta,
      );
      expect(sansPiece.status).toBe(400);
      expect(sansPiece.body.message).toContain('justificative');

      expect(
        (
          await piece(
            `/finances/operations/${petite.id}/justificatif`,
            tokenSaisie,
          )
        ).status,
      ).toBe(201);
      const validee = await api(
        'post',
        `/finances/operations/${petite.id}/valider`,
        tokenCompta,
      );
      expect(validee.status).toBe(201);
      expect(validee.body).toMatchObject({ statut: 'validee' });
      expect(validee.body.numero).toMatch(/^OP-\d{4}-\d{6}$/);
    });

    it('entre 50 001 et 200 000 FCFA, la Direction autorise avant la validation', async () => {
      const moyenne = await saisir(tokenSaisie, 120_000);
      expect(moyenne.niveauValidation).toBe(1);
      await piece(
        `/finances/operations/${moyenne.id}/justificatif`,
        tokenSaisie,
      );

      const aAutoriser = await api(
        'get',
        '/finances/operations?aAutoriser=true',
        tokenLecteur,
      );
      expect(aAutoriser.body.items.map((o: { id: string }) => o.id)).toContain(
        moyenne.id,
      );

      const sansAutorisation = await api(
        'post',
        `/finances/operations/${moyenne.id}/valider`,
        tokenCompta,
      );
      expect(sansAutorisation.status).toBe(409);
      expect(sansAutorisation.body.message).toContain('autorisation');

      // Ni l'auteur, ni un simple valideur sans pouvoir ne peuvent autoriser.
      expect(
        (
          await api(
            'post',
            `/finances/operations/${moyenne.id}/autoriser`,
            tokenSaisie,
          ).send({})
        ).status,
      ).toBe(403);
      expect(
        (
          await api(
            'post',
            `/finances/operations/${moyenne.id}/autoriser`,
            tokenDelegue,
          ).send({})
        ).status,
      ).toBe(403);

      const autorisee = await api(
        'post',
        `/finances/operations/${moyenne.id}/autoriser`,
        tokenDg,
      ).send({});
      expect(autorisee.status).toBe(201);
      expect(autorisee.body.autorisePar).toMatchObject({ firstName: 'Adama' });

      expect(
        (
          await api(
            'post',
            `/finances/operations/${moyenne.id}/valider`,
            tokenCompta,
          )
        ).status,
      ).toBe(201);
    });

    it('au-delà de 200 000 FCFA, l’autorisation est motivée ; au-delà de 500 000, deux personnes distinctes', async () => {
      const grosse = await saisir(tokenSaisie, 600_000);
      expect(grosse.niveauValidation).toBe(3);
      await piece(
        `/finances/operations/${grosse.id}/justificatif`,
        tokenSaisie,
      );

      const sansMotif = await api(
        'post',
        `/finances/operations/${grosse.id}/autoriser`,
        tokenDg,
      ).send({});
      expect(sansMotif.status).toBe(400);

      expect(
        (
          await api(
            'post',
            `/finances/operations/${grosse.id}/autoriser`,
            tokenDg,
          ).send({ motif: 'Achat de matériel validé en réunion' })
        ).status,
      ).toBe(201);

      // Celui qui autorise ne valide pas.
      const memePersonne = await api(
        'post',
        `/finances/operations/${grosse.id}/valider`,
        tokenDg,
      );
      expect(memePersonne.status).toBe(403);
      expect(
        (
          await api(
            'post',
            `/finances/operations/${grosse.id}/valider`,
            tokenCompta,
          )
        ).status,
      ).toBe(201);
    });

    it('une délégation plafonnée permet d’autoriser en l’absence de la Direction', async () => {
      await reglage('finances.delegations', { [idDelegue]: 150_000 });
      const petite = await saisir(tokenSaisie, 100_000);
      const grande = await saisir(tokenSaisie, 180_000);
      expect(
        (
          await api(
            'post',
            `/finances/operations/${petite.id}/autoriser`,
            tokenDelegue,
          ).send({})
        ).status,
      ).toBe(201);
      expect(
        (
          await api(
            'post',
            `/finances/operations/${grande.id}/autoriser`,
            tokenDelegue,
          ).send({})
        ).status,
      ).toBe(403);
    });

    it('un paiement autorisé à distance exige un motif et laisse une trace d’audit', async () => {
      const distante = await saisir(tokenSaisie, 90_000);
      expect(
        (
          await api(
            'post',
            `/finances/operations/${distante.id}/autoriser`,
            tokenDg,
          ).send({ distance: true })
        ).status,
      ).toBe(400);
      const ok = await api(
        'post',
        `/finances/operations/${distante.id}/autoriser`,
        tokenDg,
      ).send({ distance: true, motif: 'Directeur en déplacement à Abidjan' });
      expect(ok.status).toBe(201);
      expect(ok.body.autorisationDistance).toBe(true);
      expect(
        await context.prisma.auditLog.count({
          where: {
            action: 'finances.autorisation_distance',
            entityId: distante.id,
          },
        }),
      ).toBe(1);
    });

    it('modifier le montant d’une saisie annule l’autorisation donnée', async () => {
      const operation = await saisir(tokenSaisie, 100_000);
      await api(
        'post',
        `/finances/operations/${operation.id}/autoriser`,
        tokenDg,
      ).send({});
      const modifiee = await api(
        'patch',
        `/finances/operations/${operation.id}`,
        tokenSaisie,
      ).send({ montant: 400_000 });
      expect(modifiee.status).toBe(200);
      expect(modifiee.body).toMatchObject({
        niveauValidation: 2,
        autoriseParId: null,
      });
    });

    it('signale les dépenses sans justificatif', async () => {
      const sans = await api(
        'get',
        '/finances/operations?sansJustificatif=true',
        tokenLecteur,
      );
      expect(sans.status).toBe(200);
      expect(sans.body.total).toBeGreaterThan(0);
      expect(
        sans.body.items.every(
          (o: { justificatifManquant: boolean }) => o.justificatifManquant,
        ),
      ).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  describe('corrections traçables et refus de suppression', () => {
    let originale = '';
    let correction = '';

    it('refuse de supprimer une écriture validée et garde la tentative dans le journal d’audit', async () => {
      const operation = await saisir(tokenSaisie, 20_000);
      await piece(
        `/finances/operations/${operation.id}/justificatif`,
        tokenSaisie,
      );
      await api(
        'post',
        `/finances/operations/${operation.id}/valider`,
        tokenCompta,
      );
      originale = operation.id;

      const refus = await api(
        'delete',
        `/finances/operations/${operation.id}`,
        tokenSaisie,
      );
      expect(refus.status).toBe(409);
      expect(
        await context.prisma.auditLog.count({
          where: {
            action: 'finances.suppression_refusee',
            entityId: operation.id,
          },
        }),
      ).toBe(1);
    });

    it('corrige par une écriture liée, motivée, qui demande l’autorisation de la Direction', async () => {
      const sansMotif = await api(
        'post',
        `/finances/operations/${originale}/corriger`,
        tokenSaisie,
      ).send({ type: 'annulation', motif: 'ok' });
      expect(sansMotif.status).toBe(400);

      const creee = await api(
        'post',
        `/finances/operations/${originale}/corriger`,
        tokenSaisie,
      ).send({ type: 'annulation', motif: 'Saisie en double constatée' });
      expect(creee.status).toBe(201);
      correction = creee.body.id;
      expect(creee.body).toMatchObject({
        corrigeId: originale,
        sens: 'recette',
        montant: 20_000,
        motifCorrection: 'Saisie en double constatée',
        niveauValidation: 1,
        statut: 'en_attente',
      });

      // L'écriture d'origine reste consultable.
      const liste = await api(
        'get',
        '/finances/operations?statut=validee',
        tokenLecteur,
      );
      expect(liste.body.items.map((o: { id: string }) => o.id)).toContain(
        originale,
      );

      // Une seconde correction de la même écriture est refusée.
      expect(
        (
          await api(
            'post',
            `/finances/operations/${originale}/corriger`,
            tokenSaisie,
          ).send({ type: 'annulation', motif: 'Encore une fois' })
        ).status,
      ).toBe(409);

      // Sans l'autorisation de la Direction, elle ne se valide pas.
      expect(
        (
          await api(
            'post',
            `/finances/operations/${correction}/valider`,
            tokenCompta,
          )
        ).status,
      ).toBe(409);
      await api(
        'post',
        `/finances/operations/${correction}/autoriser`,
        tokenDg,
      ).send({});
      expect(
        (
          await api(
            'post',
            `/finances/operations/${correction}/valider`,
            tokenCompta,
          )
        ).status,
      ).toBe(201);
    });

    it('le journal des corrections et validations liste ces gestes', async () => {
      const etat = await api(
        'get',
        '/finances/etats/corrections-validations',
        tokenLecteur,
      );
      expect(etat.status).toBe(200);
      const gestes = etat.body.lignes.map((l: { action: string }) => l.action);
      expect(gestes).toContain('Correction d’une écriture validée');
      expect(gestes).toContain('Tentative de suppression refusée');
    });
  });

  // ------------------------------------------------------------------
  describe('comptes, soldes et remises de fonds', () => {
    let caisse = '';
    let banque = '';
    let mouvement = '';

    it('crée les comptes (réservé à l’administration) et refuse un code en double', async () => {
      const dto = {
        code: 'caisse',
        nom: 'Caisse principale',
        type: 'caisse',
        modes: ['Espèces'],
        soldeInitial: 2_000_000,
        dateSoldeInitial: '2020-01-01',
      };
      expect(
        (await api('post', '/finances/comptes', tokenCompta).send(dto)).status,
      ).toBe(403);
      const creee = await api('post', '/finances/comptes', tokenDg).send(dto);
      expect(creee.status).toBe(201);
      expect(creee.body).toMatchObject({ code: 'CAISSE', modes: ['especes'] });
      caisse = creee.body.id;
      expect(
        (await api('post', '/finances/comptes', tokenDg).send(dto)).status,
      ).toBe(409);
      const b = await api('post', '/finances/comptes', tokenDg).send({
        code: 'BANQUE',
        nom: 'Compte bancaire',
        type: 'banque',
        modes: ['virement'],
        dateSoldeInitial: '2020-01-01',
      });
      banque = b.body.id;
    });

    it('calcule les soldes à partir du solde initial et des mouvements validés', async () => {
      const recette = await api(
        'post',
        '/finances/operations',
        tokenSaisie,
      ).send({
        sens: 'recette',
        activite: 'general',
        categorie: 'subvention',
        libelle: 'Subvention',
        montant: 500_000,
        date: aujourdhui,
        modePaiement: 'especes',
      });
      expect(
        (
          await api(
            'post',
            `/finances/operations/${recette.body.id}/valider`,
            tokenCompta,
          )
        ).status,
      ).toBe(201);

      const soldes = await api('get', '/finances/soldes', tokenLecteur);
      expect(soldes.status).toBe(200);
      const parCode = (code: string) =>
        soldes.body.comptes.find((c: { code: string }) => c.code === code);
      // 2 000 000 de départ + 500 000 de recette + les dépenses en espèces déjà validées.
      const depensesEspeces = 30_000 + 120_000 + 600_000 + 20_000;
      expect(parCode('CAISSE').solde).toBe(
        2_000_000 + 500_000 - depensesEspeces + 20_000,
      );
      expect(soldes.body.consolide.solde).toBe(
        parCode('CAISSE').solde + parCode('BANQUE').solde,
      );
    });

    it('un transfert ne compte qu’une fois confirmé par une autre personne', async () => {
      const avant = (await api('get', '/finances/soldes', tokenLecteur)).body;
      const soldeCaisse = avant.comptes.find(
        (c: { code: string }) => c.code === 'CAISSE',
      ).solde;

      const creee = await api(
        'post',
        '/finances/mouvements-fonds',
        tokenSaisie,
      ).send({
        type: 'transfert',
        compteSourceId: caisse,
        compteDestinationId: banque,
        montant: 50_000,
        date: aujourdhui,
        motif: 'Dépôt en banque',
      });
      expect(creee.status).toBe(201);
      mouvement = creee.body.id;
      expect(creee.body.numero).toMatch(/^MF-\d{4}-\d{6}$/);

      // En attente : aucun effet sur les soldes.
      expect(
        (await api('get', '/finances/soldes', tokenLecteur)).body.comptes.find(
          (c: { code: string }) => c.code === 'CAISSE',
        ).solde,
      ).toBe(soldeCaisse);

      expect(
        (
          await api(
            'post',
            `/finances/mouvements-fonds/${mouvement}/confirmer`,
            tokenSaisie,
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await api(
            'post',
            `/finances/mouvements-fonds/${mouvement}/confirmer`,
            tokenCompta,
          )
        ).status,
      ).toBe(201);

      const apres = (await api('get', '/finances/soldes', tokenLecteur)).body;
      expect(
        apres.comptes.find((c: { code: string }) => c.code === 'CAISSE').solde,
      ).toBe(soldeCaisse - 50_000);
      expect(
        apres.comptes.find((c: { code: string }) => c.code === 'BANQUE').solde,
      ).toBe(50_000);
      // Un transfert déplace l'argent : le consolidé ne bouge pas.
      expect(apres.consolide.solde).toBe(avant.consolide.solde);
    });

    it('exige un bordereau complet pour une remise de fonds et refuse de supprimer un mouvement confirmé', async () => {
      const incomplet = await api(
        'post',
        '/finances/mouvements-fonds',
        tokenSaisie,
      ).send({
        type: 'remise_fonds',
        compteSourceId: caisse,
        montant: 10_000,
        date: aujourdhui,
        motif: 'Remise au Directeur',
        remetNom: 'Comptable',
      });
      expect(incomplet.status).toBe(400);
      expect(
        (
          await api(
            'delete',
            `/finances/mouvements-fonds/${mouvement}`,
            tokenSaisie,
          )
        ).status,
      ).toBe(409);
      expect(
        await context.prisma.auditLog.count({
          where: {
            action: 'finances.suppression_refusee',
            entityId: mouvement,
          },
        }),
      ).toBe(1);
    });

    it('une avance de fonds ne pèse pas sur le résultat, mais bouge la trésorerie', async () => {
      const avant = (await api('get', '/finances/tableau', tokenLecteur)).body
        .totaux;
      const avance = await saisir(tokenSaisie, 15_000, {
        nature: 'avance',
        libelle: 'Avance au chauffeur',
      });
      await piece(
        `/finances/operations/${avance.id}/justificatif`,
        tokenSaisie,
      );
      await api(
        'post',
        `/finances/operations/${avance.id}/valider`,
        tokenCompta,
      );
      const apres = (await api('get', '/finances/tableau', tokenLecteur)).body
        .totaux;
      expect(apres.depenses).toBe(avant.depenses);
      const journal = await api(
        'get',
        '/finances/journal?pageSize=200',
        tokenLecteur,
      );
      expect(
        journal.body.items.some(
          (l: { nature: string }) => l.nature === 'operation_avance',
        ),
      ).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  describe('clôture quotidienne de la caisse', () => {
    let caisse = '';
    let cloture = '';

    it('calcule le solde théorique et impose d’expliquer un écart', async () => {
      caisse = (
        await context.prisma.compteTresorerie.findUniqueOrThrow({
          where: { code: 'CAISSE' },
        })
      ).id;
      const soldes = (await api('get', '/finances/soldes', tokenLecteur)).body;
      const theorique = soldes.comptes.find(
        (c: { code: string }) => c.code === 'CAISSE',
      ).solde;

      const sansExplication = await api(
        'post',
        '/finances/clotures-caisse',
        tokenCompta,
      ).send({
        compteId: caisse,
        date: aujourdhui,
        montantCompte: theorique - 10_000,
      });
      expect(sansExplication.status).toBe(400);
      expect(sansExplication.body.message).toContain('écart');

      const creee = await api(
        'post',
        '/finances/clotures-caisse',
        tokenCompta,
      ).send({
        compteId: caisse,
        date: aujourdhui,
        montantCompte: theorique - 10_000,
        explication: 'Billet de 10 000 introuvable après recomptage',
      });
      expect(creee.status).toBe(201);
      expect(creee.body).toMatchObject({
        soldeTheorique: theorique,
        montantCompte: theorique - 10_000,
        ecart: -10_000,
        decision: 'en_attente',
      });
      cloture = creee.body.id;

      // Une seule clôture par compte et par jour.
      expect(
        (
          await api('post', '/finances/clotures-caisse', tokenCompta).send({
            compteId: caisse,
            date: aujourdhui,
            montantCompte: theorique,
          })
        ).status,
      ).toBe(409);
    });

    it('seule la Direction décide de l’écart, et la décision est tracée', async () => {
      expect(
        (
          await api(
            'post',
            `/finances/clotures-caisse/${cloture}/decision`,
            tokenCompta,
          ).send({ decision: 'acceptee', motif: 'Régularisation' })
        ).status,
      ).toBe(403);
      const decidee = await api(
        'post',
        `/finances/clotures-caisse/${cloture}/decision`,
        tokenDg,
      ).send({ decision: 'a_corriger', motif: 'Refaire le comptage demain' });
      expect(decidee.status).toBe(201);
      expect(decidee.body).toMatchObject({ decision: 'a_corriger' });
      expect(
        (
          await api(
            'post',
            `/finances/clotures-caisse/${cloture}/decision`,
            tokenDg,
          ).send({ decision: 'acceptee', motif: 'Encore' })
        ).status,
      ).toBe(409);
      expect(
        await context.prisma.auditLog.count({
          where: { action: 'finances.ecart_caisse_decide', entityId: cloture },
        }),
      ).toBe(1);
    });

    it('refuse de clôturer un jour à venir et liste les jours oubliés', async () => {
      const demain = new Date(Date.now() + 3 * 24 * 3600 * 1000)
        .toISOString()
        .slice(0, 10);
      expect(
        (
          await api('post', '/finances/clotures-caisse', tokenCompta).send({
            compteId: caisse,
            date: demain,
            montantCompte: 0,
          })
        ).status,
      ).toBe(400);
      const manquantes = await api(
        'get',
        '/finances/clotures-caisse/manquantes',
        tokenLecteur,
      );
      expect(manquantes.status).toBe(200);
      expect(Array.isArray(manquantes.body)).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  describe('terrains confiés : commission et reversements aux propriétaires', () => {
    let dossierId = '';
    let proprietaireId = '';
    let reversementId = '';
    let avanceId = '';

    beforeAll(async () => {
      const { prisma, data } = context;
      const proprietaire = await data.seedProprietaire();
      proprietaireId = proprietaire.id;
      const terrain = await prisma.terrain.create({
        data: {
          referenceInterne: 'TR-CONFIE-1',
          nom: 'Lot confié de Bambilor',
          statutJuridique: 'Titre foncier',
          niveauVerification: 'Vérifié',
          statutCommercial: 'Vendu',
          proprietaireId,
          commission: 500_000,
          produitDirect: false,
        },
      });
      const prospect = await prisma.prospect.create({
        data: { nom: 'Fall', prenom: 'Ibou', statutPipeline: 'vente' },
      });
      const dossier = await prisma.dossierVente.create({
        data: {
          prospectId: prospect.id,
          terrainId: terrain.id,
          referenceInterne: 'DV-CONFIE-1',
          prixVente: 3_500_000,
          statut: 'paiement_partiel',
        },
      });
      dossierId = dossier.id;
      await prisma.paiement.create({
        data: {
          dossierVenteId: dossier.id,
          montant: 1_750_000,
          datePaiement: new Date(),
          mode: 'virement',
          reference: 'VIR-CONFIE',
          statut: 'valide',
        },
      });
    });

    it('sépare ce qui revient à MTM de ce qui revient au propriétaire', async () => {
      const situation = await api(
        'get',
        `/finances/proprietaires/situation?dossierVenteId=${dossierId}`,
        tokenLecteur,
      );
      expect(situation.status).toBe(200);
      expect(situation.body.dossiers[0]).toMatchObject({
        prixVente: 3_500_000,
        commission: 500_000,
        du: 3_000_000,
        encaisse: 1_750_000,
        commissionAcquise: 250_000,
        partProprietaire: 1_500_000,
        exigible: 1_500_000,
        reverse: 0,
        disponibleSansAvance: 1_500_000,
      });
      expect(situation.body.parProprietaire[0].proprietaireId).toBe(
        proprietaireId,
      );
    });

    it('le revenu de MTM est la commission au prorata, pas le prix encaissé', async () => {
      const journal = await api(
        'get',
        '/finances/journal?pageSize=200',
        tokenLecteur,
      );
      const ligne = journal.body.items.find((l: { libelle: string }) =>
        l.libelle.includes('DV-CONFIE-1'),
      );
      expect(ligne).toMatchObject({ montant: 1_750_000, revenu: 250_000 });
    });

    it('refuse un reversement qui dépasse ce que MTM a encaissé pour le propriétaire', async () => {
      const trop = await api(
        'post',
        '/finances/reversements',
        tokenCompta,
      ).send({
        dossierVenteId: dossierId,
        montant: 1_600_000,
        motif: 'Reversement',
      });
      expect(trop.status).toBe(400);
      expect(trop.body.message).toContain('avance');
    });

    it('demande, autorise (par une autre personne), puis paie avec la preuve', async () => {
      const creee = await api(
        'post',
        '/finances/reversements',
        tokenCompta,
      ).send({
        dossierVenteId: dossierId,
        montant: 1_500_000,
        motif: 'Reversement au fur et à mesure',
      });
      expect(creee.status).toBe(201);
      expect(creee.body.numero).toMatch(/^RP-\d{4}-\d{6}$/);
      reversementId = creee.body.id;

      // Pas d'auto-autorisation, pas de paiement avant autorisation.
      expect(
        (
          await api(
            'post',
            `/finances/reversements/${reversementId}/autoriser`,
            tokenCompta,
          ).send({})
        ).status,
      ).toBe(403);
      expect(
        (
          await api(
            'post',
            `/finances/reversements/${reversementId}/payer`,
            tokenCompta,
          ).send({
            modePaiement: 'virement',
            reference: 'VIR-PROP-1',
            datePaiement: aujourdhui,
          })
        ).status,
      ).toBe(409);

      expect(
        (
          await api(
            'post',
            `/finances/reversements/${reversementId}/autoriser`,
            tokenDg,
          ).send({})
        ).status,
      ).toBe(201);

      // La preuve du paiement est obligatoire.
      const sansPreuve = await api(
        'post',
        `/finances/reversements/${reversementId}/payer`,
        tokenCompta,
      ).send({
        modePaiement: 'virement',
        reference: 'VIR-PROP-1',
        datePaiement: aujourdhui,
      });
      expect(sansPreuve.status).toBe(400);
      expect(
        (
          await piece(
            `/finances/reversements/${reversementId}/justificatif`,
            tokenCompta,
          )
        ).status,
      ).toBe(201);

      const avant = (await api('get', '/finances/tableau', tokenLecteur)).body
        .totaux;
      const payee = await api(
        'post',
        `/finances/reversements/${reversementId}/payer`,
        tokenCompta,
      ).send({
        modePaiement: 'virement',
        reference: 'VIR-PROP-1',
        datePaiement: aujourdhui,
      });
      expect(payee.status).toBe(201);
      expect(payee.body).toMatchObject({ statut: 'paye', montant: 1_500_000 });

      // Le reversement sort de la trésorerie sans peser sur le résultat de MTM.
      const apres = (await api('get', '/finances/tableau', tokenLecteur)).body
        .totaux;
      expect(apres.depenses).toBe(avant.depenses);
      const journal = await api(
        'get',
        '/finances/journal?pageSize=200',
        tokenLecteur,
      );
      expect(
        journal.body.items.some(
          (l: { nature: string }) => l.nature === 'reversement_proprietaire',
        ),
      ).toBe(true);

      const situation = await api(
        'get',
        `/finances/proprietaires/situation?dossierVenteId=${dossierId}`,
        tokenLecteur,
      );
      expect(situation.body.dossiers[0]).toMatchObject({
        reverse: 1_500_000,
        soldeRestant: 1_500_000,
        disponibleSansAvance: 0,
      });
    });

    it('une avance au propriétaire est motivée et autorisée expressément par la Direction', async () => {
      const courte = await api(
        'post',
        '/finances/reversements',
        tokenCompta,
      ).send({
        dossierVenteId: dossierId,
        montant: 500_000,
        type: 'avance',
        motif: 'Urgence',
      });
      expect(courte.status).toBe(400);

      const creee = await api(
        'post',
        '/finances/reversements',
        tokenCompta,
      ).send({
        dossierVenteId: dossierId,
        montant: 500_000,
        type: 'avance',
        motif: 'Frais médicaux urgents du propriétaire, accord du DG',
      });
      expect(creee.status).toBe(201);
      avanceId = creee.body.id;

      // Même avec une délégation, un délégué n'autorise pas une avance.
      await reglage('finances.delegations', { [idDelegue]: 5_000_000 });
      expect(
        (
          await api(
            'post',
            `/finances/reversements/${avanceId}/autoriser`,
            tokenDelegue,
          ).send({ motif: 'Je délègue' })
        ).status,
      ).toBe(403);
      expect(
        (
          await api(
            'post',
            `/finances/reversements/${avanceId}/autoriser`,
            tokenDg,
          ).send({})
        ).status,
      ).toBe(400);
      expect(
        (
          await api(
            'post',
            `/finances/reversements/${avanceId}/autoriser`,
            tokenDg,
          ).send({ motif: 'Autorisation expresse du Directeur général' })
        ).status,
      ).toBe(201);
      expect(
        await context.prisma.auditLog.count({
          where: {
            action: 'finances.avance_proprietaire_autorisee',
            entityId: avanceId,
          },
        }),
      ).toBe(1);

      // Une avance ne dépasse jamais le dû restant.
      const enTrop = await api(
        'post',
        '/finances/reversements',
        tokenCompta,
      ).send({
        dossierVenteId: dossierId,
        montant: 2_000_000,
        type: 'avance',
        motif: 'Avance excessive pour le test du plafond',
      });
      expect(enTrop.status).toBe(400);
    });

    it('le mode de reversement est une clause du mandat, réservée à l’administration', async () => {
      const { prisma } = context;
      const proprietaire = await context.data.seedProprietaire();
      const mandat = await prisma.mandat.create({
        data: {
          proprietaireId: proprietaire.id,
          referenceInterne: 'MND-FIN-1',
          typeMandat: 'simple',
          dateDebut: new Date('2026-01-01T00:00:00Z'),
          dateFin: new Date('2027-01-01T00:00:00Z'),
        },
      });
      expect(
        (
          await api(
            'patch',
            `/finances/mandats/${mandat.id}/mode-reversement`,
            tokenCompta,
          ).send({ modeReversement: 'fin_paiement' })
        ).status,
      ).toBe(403);
      const ok = await api(
        'patch',
        `/finances/mandats/${mandat.id}/mode-reversement`,
        tokenDg,
      ).send({ modeReversement: 'fin_paiement' });
      expect(ok.status).toBe(200);
      expect(ok.body.modeReversement).toBe('fin_paiement');
      expect(
        (
          await api(
            'patch',
            `/finances/mandats/${mandat.id}/mode-reversement`,
            tokenDg,
          ).send({ modeReversement: 'jamais' })
        ).status,
      ).toBe(400);
    });
  });

  // ------------------------------------------------------------------
  describe('désistement et remboursement', () => {
    let dossierId = '';
    let demandeId = '';

    beforeAll(async () => {
      const { prisma } = context;
      const prospect = await prisma.prospect.create({
        data: { nom: 'Diop', prenom: 'Awa', statutPipeline: 'vente' },
      });
      const dossier = await prisma.dossierVente.create({
        data: {
          prospectId: prospect.id,
          referenceInterne: 'DV-DESIST-1',
          prixVente: 8_000_000,
          statut: 'reserve',
        },
      });
      dossierId = dossier.id;
      await prisma.reservation.create({
        data: {
          dossierVenteId: dossier.id,
          montantAcompte: 1_000_000,
          dureeBlocageJours: 15,
          dateExpiration: new Date(Date.now() + 15 * 24 * 3600 * 1000),
        },
      });
      await prisma.paiement.create({
        data: {
          dossierVenteId: dossier.id,
          montant: 1_000_000,
          datePaiement: new Date(),
          mode: 'especes',
          statut: 'valide',
        },
      });
    });

    it('simule la retenue de 50 % de l’avance et le délai de six mois', async () => {
      const simulation = await api(
        'get',
        `/finances/remboursements/simulation/${dossierId}`,
        tokenLecteur,
      );
      expect(simulation.status).toBe(200);
      expect(simulation.body).toMatchObject({
        montantVerse: 1_000_000,
        avance: 1_000_000,
        retenuePct: 50,
        montantRetenu: 500_000,
        montantRembourse: 500_000,
        delaiMois: 6,
        regleValidee: false,
      });
    });

    it('instruit la demande mais refuse de l’accepter tant que la clause n’est pas validée juridiquement', async () => {
      const creee = await api(
        'post',
        '/finances/remboursements',
        tokenCompta,
      ).send({
        dossierVenteId: dossierId,
        dateDemande: aujourdhui,
        motif: 'Le client renonce à l’achat',
      });
      expect(creee.status).toBe(201);
      demandeId = creee.body.id;
      expect(creee.body).toMatchObject({
        statut: 'demandee',
        montantRembourse: 500_000,
        regleValidee: false,
      });

      // Une seule demande ouverte par dossier.
      expect(
        (
          await api('post', '/finances/remboursements', tokenCompta).send({
            dossierVenteId: dossierId,
            dateDemande: aujourdhui,
          })
        ).status,
      ).toBe(409);

      const bloquee = await api(
        'post',
        `/finances/remboursements/${demandeId}/decision`,
        tokenDg,
      ).send({ decision: 'acceptee', motif: 'Accord de principe' });
      expect(bloquee.status).toBe(409);
      expect(bloquee.body.message).toContain('juridiquement');
    });

    it('une fois la clause validée, la Direction accepte ; le paiement exige la preuve', async () => {
      await reglage('finances.desistement', {
        retenuePct: 50,
        delaiMois: 6,
        validee: true,
        version: 'protocole-v1',
      });
      expect(
        (
          await api(
            'post',
            `/finances/remboursements/${demandeId}/decision`,
            tokenCompta,
          ).send({ decision: 'acceptee', motif: 'Je décide' })
        ).status,
      ).toBe(403);
      const acceptee = await api(
        'post',
        `/finances/remboursements/${demandeId}/decision`,
        tokenDg,
      ).send({ decision: 'acceptee', motif: 'Conforme au protocole signé' });
      expect(acceptee.status).toBe(201);
      expect(acceptee.body).toMatchObject({
        statut: 'acceptee',
        regleValidee: true,
      });

      const dto = {
        modePaiement: 'especes',
        reference: 'REMB-1',
        datePaiement: aujourdhui,
      };
      expect(
        (
          await api(
            'post',
            `/finances/remboursements/${demandeId}/payer`,
            tokenCompta,
          ).send(dto)
        ).status,
      ).toBe(400);
      await piece(
        `/finances/remboursements/${demandeId}/justificatif`,
        tokenCompta,
      );
      const payee = await api(
        'post',
        `/finances/remboursements/${demandeId}/payer`,
        tokenCompta,
      ).send(dto);
      expect(payee.status).toBe(201);
      expect(payee.body.statut).toBe('payee');

      const journal = await api(
        'get',
        '/finances/journal?pageSize=200',
        tokenLecteur,
      );
      expect(
        journal.body.items.find(
          (l: { nature: string }) => l.nature === 'remboursement_client',
        ),
      ).toMatchObject({ sens: 'sortie', montant: 500_000 });
    });
  });

  // ------------------------------------------------------------------
  describe('fiche financière d’un chantier', () => {
    let projetId = '';
    let paiementId = '';

    beforeAll(async () => {
      const { prisma } = context;
      const client = await prisma.prospect.create({
        data: { nom: 'Sarr', prenom: 'Omar', statutPipeline: 'vente' },
      });
      const projet = await prisma.projetConstruction.create({
        data: {
          referenceInterne: 'CH-TRESO-1',
          clientId: client.id,
          intitule: 'Villa de Saly',
          typeProjet: 'villa',
          montantDevis: 10_000_000,
          budgetPrevu: 8_000_000,
          avancement: 50,
        },
      });
      projetId = projet.id;
      await prisma.depenseChantier.createMany({
        data: [
          {
            projetId,
            libelle: 'Fer à béton',
            poste: 'materiaux',
            montant: 3_000_000,
            date: new Date(),
            statut: 'valide',
          },
          {
            projetId,
            libelle: 'Carrelage acheté par le client',
            poste: 'materiaux',
            montant: 1_000_000,
            date: new Date(),
            statut: 'valide',
            payeParClient: true,
          },
        ],
      });
    });

    it('définit l’échéancier du client (acompte, solde) sans dépasser le prix', async () => {
      const trop = await api(
        'put',
        `/finances/chantiers/${projetId}/echeances`,
        tokenCompta,
      ).send({
        echeances: [{ libelle: 'Acompte', montantPrevu: 11_000_000 }],
      });
      expect(trop.status).toBe(400);
      const ok = await api(
        'put',
        `/finances/chantiers/${projetId}/echeances`,
        tokenCompta,
      ).send({
        echeances: [
          { libelle: 'Acompte de 50 %', montantPrevu: 5_000_000 },
          { libelle: 'Solde à la réception', montantPrevu: 5_000_000 },
        ],
      });
      expect(ok.status).toBe(200);
      expect(ok.body.echeances).toHaveLength(2);
    });

    it('un paiement du client compte après validation par une autre personne', async () => {
      const fiche = (
        await api('get', `/finances/chantiers/${projetId}`, tokenLecteur)
      ).body;
      const echeanceId = fiche.echeances[0].id;
      const creee = await api(
        'post',
        `/finances/chantiers/${projetId}/paiements`,
        tokenSaisie,
      ).send({
        echeanceId,
        montant: 5_000_000,
        date: aujourdhui,
        mode: 'virement',
        reference: 'VIR-CH-1',
      });
      expect(creee.status).toBe(201);
      paiementId = creee.body.id;
      expect(creee.body.numero).toMatch(/^PC-\d{4}-\d{6}$/);

      // Encore en attente : rien dans les recettes confirmées.
      expect(
        (await api('get', `/finances/chantiers/${projetId}`, tokenLecteur)).body
          .recettesConfirmees,
      ).toBe(0);

      expect(
        (
          await api(
            'post',
            `/finances/chantiers/paiements/${paiementId}/valider`,
            tokenSaisie,
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await api(
            'post',
            `/finances/chantiers/paiements/${paiementId}/valider`,
            tokenCompta,
          )
        ).status,
      ).toBe(201);
    });

    it('calcule les marges et laisse les achats du client hors de la trésorerie de MTM', async () => {
      const fiche = await api(
        'get',
        `/finances/chantiers/${projetId}`,
        tokenLecteur,
      );
      expect(fiche.status).toBe(200);
      expect(fiche.body).toMatchObject({
        prixTotal: 10_000_000,
        budgetPrevu: 8_000_000,
        recettesConfirmees: 5_000_000,
        coutReel: 3_000_000,
        achatsClient: 1_000_000,
        margePrevisionnelle: 2_000_000,
        margeReelle: 2_000_000,
        resteACollecter: 5_000_000,
      });
      expect(fiche.body.echeances[0]).toMatchObject({
        statut: 'payee',
        montantPaye: 5_000_000,
      });

      const journal = await api(
        'get',
        '/finances/journal?pageSize=200',
        tokenLecteur,
      );
      const libelles = journal.body.items.map(
        (l: { libelle: string }) => l.libelle,
      );
      expect(libelles.some((l: string) => l.includes('Fer à béton'))).toBe(
        true,
      );
      expect(libelles.some((l: string) => l.includes('Carrelage acheté'))).toBe(
        false,
      );
      expect(
        libelles.some((l: string) => l.includes('Paiement client — chantier')),
      ).toBe(true);
    });

    it('classe les chantiers par rentabilité', async () => {
      const liste = await api(
        'get',
        '/finances/chantiers/rentabilite',
        tokenLecteur,
      );
      expect(liste.status).toBe(200);
      expect(liste.body[0]).toMatchObject({
        referenceInterne: 'CH-TRESO-1',
        margeReelle: 2_000_000,
      });
    });
  });

  // ------------------------------------------------------------------
  // ------------------------------------------------------------------
  describe('rapprochement bancaire', () => {
    let banque = '';
    let caisse = '';
    let etat: {
      lignes: Array<{
        id: string;
        libelle: string;
        statut: string;
        montant: number;
        suggestions: Array<{ id: string }>;
      }>;
      mouvementsNonRapproches: Array<{
        id: string;
        libelle: string;
        montant: number;
      }>;
      resume: Record<string, number>;
    };

    const releve = [
      'Date;Libellé;Référence;Montant',
      `${aujourdhui};Virement client Fall;VIR-CONFIE;1 750 000`,
      `${aujourdhui};Virement propriétaire;VIR-PROP-1;-1 500 000`,
      `${aujourdhui};Virement client Sarr;VIR-CH-1;5 000 000`,
      `${aujourdhui};Frais de tenue de compte;;-3 500`,
      `${aujourdhui};Dépôt espèces;;50 000`,
    ].join('\n');

    const importer = (compteId: string, contenu: string, token = tokenCompta) =>
      api('post', `/finances/rapprochement/${compteId}/import`, token).attach(
        'file',
        Buffer.from(contenu, 'utf8'),
        { filename: 'releve.csv', contentType: 'text/csv' },
      );

    const charger = async () => {
      const reponse = await api(
        'get',
        `/finances/rapprochement/${banque}`,
        tokenLecteur,
      );
      expect(reponse.status).toBe(200);
      etat = reponse.body;
      return etat;
    };

    beforeAll(async () => {
      const { prisma } = context;
      banque = (
        await prisma.compteTresorerie.findUniqueOrThrow({
          where: { code: 'BANQUE' },
        })
      ).id;
      caisse = (
        await prisma.compteTresorerie.findUniqueOrThrow({
          where: { code: 'CAISSE' },
        })
      ).id;
    });

    it('refuse d’importer un relevé pour une caisse, ou sans fichier, ou sans le droit', async () => {
      expect((await importer(caisse, releve)).status).toBe(400);
      expect(
        (
          await api(
            'post',
            `/finances/rapprochement/${banque}/import`,
            tokenCompta,
          )
        ).status,
      ).toBe(400);
      expect((await importer(banque, releve, tokenLecteur)).status).toBe(403);
    });

    it('importe le relevé sans jamais le dupliquer, et signale les lignes illisibles', async () => {
      const premier = await importer(banque, releve);
      expect(premier.status).toBe(201);
      expect(premier.body).toMatchObject({
        lues: 5,
        importees: 5,
        dejaImportees: 0,
        erreurs: [],
      });

      const second = await importer(banque, releve);
      expect(second.body).toMatchObject({ importees: 0, dejaImportees: 5 });

      const abime = await importer(
        banque,
        'date;libelle;montant\nn’importe quoi;x;5\n' +
          `${aujourdhui};Frais exceptionnels;-100`,
      );
      expect(abime.body.importees).toBe(1);
      expect(abime.body.erreurs).toEqual([
        expect.objectContaining({ ligne: 2, message: 'Date illisible' }),
      ]);

      expect(
        await context.prisma.auditLog.count({
          where: { action: 'finances.releve_importe' },
        }),
      ).toBe(3);
    });

    it('met en regard le relevé et les mouvements du logiciel, avec des suggestions', async () => {
      const e = await charger();
      expect(e.resume).toMatchObject({
        lignes: 6,
        nonRapprochees: 6,
        rapprochees: 0,
      });
      const virement = e.lignes.find(
        (l) => l.libelle === 'Virement client Fall',
      );
      expect(virement?.suggestions).toHaveLength(1);
      expect(e.mouvementsNonRapproches.map((m) => m.montant)).toEqual(
        expect.arrayContaining([1_750_000, -1_500_000, 5_000_000, 50_000]),
      );
    });

    it('rapproche automatiquement ce qui ne souffre aucune ambiguïté, et laisse le reste', async () => {
      expect(
        (
          await api(
            'post',
            `/finances/rapprochement/${banque}/auto`,
            tokenLecteur,
          ).send({})
        ).status,
      ).toBe(403);
      const auto = await api(
        'post',
        `/finances/rapprochement/${banque}/auto`,
        tokenCompta,
      ).send({});
      expect(auto.status).toBe(201);
      expect(auto.body).toEqual({ rapprochees: 4, restantes: 2 });

      const e = await charger();
      const traitees = e.lignes
        .filter((l) => l.statut === 'rapproche')
        .map((l) => l.libelle);
      expect(traitees.sort()).toEqual([
        'Dépôt espèces',
        'Virement client Fall',
        'Virement client Sarr',
        'Virement propriétaire',
      ]);
      expect(e.mouvementsNonRapproches).toHaveLength(0);
    });

    it('refuse de rapprocher deux montants différents, ou un mouvement déjà pris', async () => {
      const recette = await api(
        'post',
        '/finances/operations',
        tokenSaisie,
      ).send({
        sens: 'recette',
        activite: 'general',
        categorie: 'subvention',
        libelle: 'Subvention par virement',
        montant: 12_345,
        date: aujourdhui,
        modePaiement: 'virement',
      });
      await api(
        'post',
        `/finances/operations/${recette.body.id}/valider`,
        tokenCompta,
      );
      const mouvementId = `operation:${recette.body.id}`;

      const frais = (await charger()).lignes.find(
        (l) => l.libelle === 'Frais de tenue de compte',
      );
      const mauvais = await api(
        'post',
        `/finances/rapprochement/lignes/${frais?.id}/rapprocher`,
        tokenCompta,
      ).send({ mouvementId });
      expect(mauvais.status).toBe(400);
      expect(mauvais.body.message).toContain('montant');

      expect(
        (
          await api(
            'post',
            `/finances/rapprochement/lignes/${frais?.id}/rapprocher`,
            tokenCompta,
          ).send({ mouvementId: 'operation:inexistant' })
        ).status,
      ).toBe(404);

      // Une autre ligne de 1 750 000 ne peut pas prendre le mouvement déjà rapproché.
      await importer(
        banque,
        `date;libelle;montant\n${aujourdhui};Virement douteux;1750000`,
      );
      const douteux = (await charger()).lignes.find(
        (l) => l.libelle === 'Virement douteux',
      );
      const pris = (
        await api('get', `/finances/rapprochement/${banque}`, tokenLecteur)
      ).body.lignes.find(
        (l: { libelle: string }) => l.libelle === 'Virement client Fall',
      );
      const conflit = await api(
        'post',
        `/finances/rapprochement/lignes/${douteux?.id}/rapprocher`,
        tokenCompta,
      ).send({
        mouvementId: (
          await context.prisma.releveLigne.findUniqueOrThrow({
            where: { id: pris.id },
          })
        ).mouvementId,
      });
      expect(conflit.status).toBe(409);
    });

    it('ignore une ligne avec son motif, annule un rapprochement, et trace tout', async () => {
      const frais = (await charger()).lignes.find(
        (l) => l.libelle === 'Frais de tenue de compte',
      );
      const sansMotif = await api(
        'post',
        `/finances/rapprochement/lignes/${frais?.id}/ignorer`,
        tokenCompta,
      ).send({});
      expect(sansMotif.status).toBe(400);
      const ignoree = await api(
        'post',
        `/finances/rapprochement/lignes/${frais?.id}/ignorer`,
        tokenCompta,
      ).send({ motif: 'Frais bancaires mensuels, déjà passés en charges' });
      expect(ignoree.status).toBe(201);
      expect(ignoree.body).toMatchObject({ statut: 'ignore' });

      const annulee = await api(
        'post',
        `/finances/rapprochement/lignes/${frais?.id}/annuler`,
        tokenCompta,
      );
      expect(annulee.status).toBe(201);
      expect(annulee.body).toMatchObject({
        statut: 'non_rapproche',
        motifIgnore: null,
      });
      expect(
        (
          await api(
            'post',
            `/finances/rapprochement/lignes/${frais?.id}/annuler`,
            tokenCompta,
          )
        ).status,
      ).toBe(409);

      const actions = (
        await context.prisma.auditLog.findMany({
          where: { action: { startsWith: 'finances.rapprochement' } },
          select: { action: true },
        })
      ).map((a) => a.action);
      expect(actions).toEqual(
        expect.arrayContaining([
          'finances.rapprochement_automatique',
          'finances.rapprochement_ignore',
          'finances.rapprochement_annule',
        ]),
      );
    });
  });

  describe('tableau de bord de la Direction et états', () => {
    it('consolide trésorerie, créances, propriétaires, chantiers et anomalies', async () => {
      const direction = await api('get', '/finances/direction', tokenLecteur);
      expect(direction.status).toBe(200);
      expect(direction.body).toEqual(
        expect.objectContaining({
          totaux: expect.any(Object),
          tresorerie: expect.objectContaining({
            comptes: expect.any(Array),
            consolide: expect.any(Object),
          }),
          aEncaisser: expect.any(Object),
          proprietaires: expect.objectContaining({
            soldeRestant: expect.any(Number),
          }),
          reversements: expect.objectContaining({
            enAttente: expect.any(Object),
            aPayer: expect.any(Object),
          }),
          chantiers: expect.objectContaining({ nombre: expect.any(Number) }),
          depensesSansJustificatif: expect.any(Object),
          ecartsCaisse: expect.objectContaining({ nombre: expect.any(Number) }),
          anomaliesAudit: expect.objectContaining({
            nombre: expect.any(Number),
          }),
        }),
      );
      // La suppression refusée plus haut est une anomalie visible de la Direction.
      expect(direction.body.anomaliesAudit.nombre).toBeGreaterThan(0);
      // Des lignes de relevé attendent encore leur rapprochement.
      expect(direction.body.rapprochement.lignesNonRapprochees).toBeGreaterThan(
        0,
      );
      // L'écart de caisse « à corriger » reste ouvert.
      expect(direction.body.ecartsCaisse.nombre).toBeGreaterThan(0);
    });

    it('filtre le tableau par activité et par mode de paiement', async () => {
      const tout = (await api('get', '/finances/tableau', tokenLecteur)).body;
      const especes = (
        await api('get', '/finances/tableau?mode=Espèces', tokenLecteur)
      ).body;
      const construction = (
        await api(
          'get',
          '/finances/tableau?activite=construction',
          tokenLecteur,
        )
      ).body;
      expect(especes.totaux.encaissements).toBeLessThan(
        tout.totaux.encaissements,
      );
      expect(construction.totaux.encaissements).toBe(5_000_000);
    });

    it('propose les états à la demande, en JSON et en CSV', async () => {
      const catalogue = await api('get', '/finances/etats', tokenLecteur);
      expect(catalogue.body.map((e: { code: string }) => e.code)).toEqual(
        expect.arrayContaining([
          'journal-caisse',
          'journal-banques',
          'depenses-par-categorie',
          'recettes-par-activite',
          'ventes',
          'creances',
          'commissions-mtm',
          'proprietaires',
          'rentabilite-chantiers',
          'sans-justificatif',
          'corrections-validations',
        ]),
      );

      const caisse = await api(
        'get',
        '/finances/etats/journal-caisse',
        tokenLecteur,
      );
      expect(caisse.status).toBe(200);
      expect(caisse.body.lignes.length).toBeGreaterThan(0);
      expect(caisse.body.lignes[0]).toHaveProperty('solde');

      const proprietaires = await api(
        'get',
        '/finances/etats/proprietaires',
        tokenLecteur,
      );
      expect(proprietaires.body.lignes[0]).toMatchObject({
        dossier: 'DV-CONFIE-1',
        commission: 500_000,
        du: 3_000_000,
      });

      const csv = await api(
        'get',
        '/finances/etats/depenses-par-categorie?csv=true',
        tokenLecteur,
      );
      expect(csv.status).toBe(200);
      expect(csv.headers['content-type']).toContain('text/csv');
      expect(csv.text).toContain('Catégorie ou nature;Opérations;Montant');

      expect(
        (await api('get', '/finances/etats/inconnu', tokenLecteur)).status,
      ).toBe(404);
    });

    it('réserve la consultation aux droits financiers', async () => {
      const { data } = context;
      const role = await data.seedRoleWithPermissions('sans_finances', [
        'contact:consulter',
      ]);
      const user = await data.seedUser({
        email: 'sans@tresorerie.test',
        password: PASSWORD,
        firstName: 'Seynabou',
      });
      await data.linkUserRole(user.id, role.id);
      const token = await login('sans@tresorerie.test');
      for (const chemin of [
        '/finances/direction',
        '/finances/soldes',
        '/finances/reversements',
        '/finances/etats/ventes',
        '/finances/rapport-quotidien',
      ]) {
        expect((await api('get', chemin, token)).status).toBe(403);
      }
      expect(
        (
          await api('post', '/finances/reversements', tokenLecteur).send({
            dossierVenteId: '00000000-0000-0000-0000-000000000000',
            montant: 1,
            motif: 'Sans droit',
          })
        ).status,
      ).toBe(403);
    });
  });

  // ------------------------------------------------------------------
  describe('rapport financier quotidien', () => {
    it('se prépare, se vérifie par une autre personne, se transmet puis se fige', async () => {
      const apercu = await api(
        'get',
        `/finances/rapport-quotidien?date=${aujourdhui}`,
        tokenLecteur,
      );
      expect(apercu.status).toBe(200);
      expect(apercu.body).toMatchObject({
        statut: 'apercu',
        enregistre: false,
      });
      expect(apercu.body.contenu).toEqual(
        expect.objectContaining({
          caisses: expect.any(Array),
          encaissementsParMode: expect.any(Array),
          depenses: expect.any(Array),
          reversements: expect.any(Object),
          anomalies: expect.any(Array),
        }),
      );

      const prepare = await api(
        'post',
        '/finances/rapport-quotidien/preparer',
        tokenSaisie,
      ).send({ date: aujourdhui });
      expect(prepare.status).toBe(201);
      expect(prepare.body.statut).toBe('brouillon');

      expect(
        (
          await api(
            'post',
            '/finances/rapport-quotidien/verifier',
            tokenSaisie,
          ).send({
            date: aujourdhui,
          })
        ).status,
      ).toBe(403);
      const verifie = await api(
        'post',
        '/finances/rapport-quotidien/verifier',
        tokenCompta,
      ).send({ date: aujourdhui });
      expect(verifie.status).toBe(201);
      expect(verifie.body).toMatchObject({
        statut: 'verifie',
        verifiePar: expect.stringContaining('Cheikh'),
      });

      const transmis = await api(
        'post',
        '/finances/rapport-quotidien/transmettre',
        tokenSaisie,
      ).send({ date: aujourdhui });
      expect(transmis.status).toBe(201);
      expect(transmis.body.statut).toBe('transmis');
      expect(
        await context.prisma.notification.count({
          where: { type: 'rapport_quotidien' },
        }),
      ).toBeGreaterThan(0);

      // Figé : plus de préparation, plus de transmission.
      expect(
        (
          await api(
            'post',
            '/finances/rapport-quotidien/preparer',
            tokenSaisie,
          ).send({
            date: aujourdhui,
          })
        ).status,
      ).toBe(409);
      expect(
        (
          await api(
            'post',
            '/finances/rapport-quotidien/transmettre',
            tokenSaisie,
          ).send({ date: aujourdhui })
        ).status,
      ).toBe(409);
    });

    it('produit le PDF du rapport', async () => {
      const pdf = await api(
        'get',
        `/finances/rapport-quotidien/pdf?date=${aujourdhui}`,
        tokenLecteur,
      ).buffer(true);
      expect(pdf.status).toBe(200);
      expect(pdf.headers['content-type']).toContain('application/pdf');
      expect(pdf.body.subarray(0, 4).toString()).toBe('%PDF');
    });

    it('un jour sans opération donne quand même un rapport, qui le dit', async () => {
      const jourCalme = '2020-01-02';
      const prepare = await api(
        'post',
        '/finances/rapport-quotidien/preparer',
        tokenCompta,
      ).send({ date: jourCalme });
      expect(prepare.status).toBe(201);
      expect(prepare.body.contenu.aucuneOperation).toBe(true);
      const pdf = await api(
        'get',
        `/finances/rapport-quotidien/pdf?date=${jourCalme}`,
        tokenLecteur,
      ).buffer(true);
      expect(pdf.status).toBe(200);
      expect(pdf.body.subarray(0, 4).toString()).toBe('%PDF');

      const historique = await api(
        'get',
        '/finances/rapport-quotidien/historique',
        tokenLecteur,
      );
      expect(historique.body.length).toBeGreaterThanOrEqual(2);
    });
  });
});
