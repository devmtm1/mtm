// Plusieurs comptes se connectent à la suite : on relève la limite de connexions.
process.env.LOGIN_RATE_LIMIT_MAX = '100';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2eApp, type E2eContext } from './helpers/e2e-app';
import { createStockageDeTest } from './helpers/cloudinary-mock';
import { describeE2e } from './helpers/e2e-database';
import { MaterielRappelsService } from '../src/modules/materiel/materiel-rappels.service';

/**
 * Patrimoine matériel : chaque objet porte un autocollant « MTM 0003 ». Le secrétariat tient le registre, la Direction fait
 * sortir un objet du parc ; rien n'est supprimé.
 */
describeE2e('Patrimoine matériel (e2e)', () => {
  let app: INestApplication;
  let context: E2eContext;
  let tokenSecretaire: string;
  let tokenDirection: string;
  let tokenLecteur: string;
  let tokenSansDroit: string;
  let idSecretaire: string;

  const PASSWORD = 'MotDePasse-Solide-2026';
  const PNG = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48,
    0x44, 0x52,
  ]);

  const login = async (email: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: PASSWORD });
    expect(response.status).toBe(201);
    return response.body.accessToken as string;
  };
  const get = (token: string, chemin: string) =>
    request(app.getHttpServer())
      .get(`/api/materiel${chemin}`)
      .set('Authorization', `Bearer ${token}`);
  const post = (token: string, chemin: string, corps: object = {}) =>
    request(app.getHttpServer())
      .post(`/api/materiel${chemin}`)
      .set('Authorization', `Bearer ${token}`)
      .send(corps);
  const patch = (token: string, chemin: string, corps: object) =>
    request(app.getHttpServer())
      .patch(`/api/materiel${chemin}`)
      .set('Authorization', `Bearer ${token}`)
      .send(corps);
  const creer = async (corps: Record<string, unknown>) => {
    const reponse = await post(tokenSecretaire, '', {
      categorie: 'Mobilier',
      ...corps,
    });
    expect(reponse.status).toBe(201);
    return reponse.body as { id: string; numero: number; reference: string };
  };

  beforeAll(async () => {
    context = await createE2eApp({ cloudinary: createStockageDeTest() });
    app = context.app;
    const { data } = context;
    const secretaire = await data.seedRoleWithPermissions('secretaire', [
      'materiel:consulter',
      'materiel:creer',
      'materiel:modifier',
    ]);
    const direction = await data.seedRoleWithPermissions('controle_materiel', [
      'materiel:consulter',
      'materiel:creer',
      'materiel:modifier',
      'materiel:valider',
    ]);
    const lecteur = await data.seedRoleWithPermissions('lecteur_materiel', [
      'materiel:consulter',
    ]);
    const sansDroit = await data.seedRoleWithPermissions('stagiaire', [
      'contact:consulter',
    ]);
    for (const [email, role] of [
      ['secretaire@mtm.sn', secretaire],
      ['direction@mtm.sn', direction],
      ['lecteur@mtm.sn', lecteur],
      ['stagiaire@mtm.sn', sansDroit],
    ] as const) {
      const user = await data.seedUser({ email, password: PASSWORD });
      await data.linkUserRole(user.id, role.id);
      if (email === 'secretaire@mtm.sn') idSecretaire = user.id;
    }
    tokenSecretaire = await login('secretaire@mtm.sn');
    tokenDirection = await login('direction@mtm.sn');
    tokenLecteur = await login('lecteur@mtm.sn');
    tokenSansDroit = await login('stagiaire@mtm.sn');
  });

  afterAll(async () => {
    await context.close();
  });

  it('refuse l’accès à qui n’a pas la permission', async () => {
    expect((await get(tokenSansDroit, '')).status).toBe(403);
    expect(
      (
        await post(tokenLecteur, '', {
          designation: 'Chaise',
          categorie: 'Mobilier',
        })
      ).status,
    ).toBe(403);
  });

  it('attribue le numéro suivant, accepte un numéro déjà collé et refuse un doublon', async () => {
    const premier = await creer({ designation: 'Bureau en bois' });
    expect(premier.numero).toBe(1);
    expect(premier.reference).toBe('MTM 0001');
    // Un objet déjà étiqueté « MTM 0003 » garde son numéro.
    const existant = await creer({
      designation: 'Table de réunion',
      numero: 3,
    });
    expect(existant.reference).toBe('MTM 0003');
    // Le numéro automatique continue après le plus grand.
    expect((await creer({ designation: 'Chaise' })).numero).toBe(4);
    const doublon = await post(tokenSecretaire, '', {
      designation: 'Autre table',
      categorie: 'Mobilier',
      numero: 3,
    });
    expect(doublon.status).toBe(409);
    expect((await get(tokenSecretaire, '/options')).body.prochainNumero).toBe(
      5,
    );
  });

  it('refuse une catégorie ou un lieu hors de la liste réglée', async () => {
    const categorie = await post(tokenSecretaire, '', {
      designation: 'X',
      categorie: 'Inconnue',
    });
    expect(categorie.status).toBe(400);
    const lieu = await post(tokenSecretaire, '', {
      designation: 'X',
      categorie: 'Mobilier',
      lieu: 'Mars',
    });
    expect(lieu.status).toBe(400);
  });

  it('retrouve un objet par son numéro, quelle que soit la façon de l’écrire', async () => {
    for (const saisie of ['3', '0003', 'MTM 0003', 'mtm-3']) {
      const reponse = await get(
        tokenSecretaire,
        `?q=${encodeURIComponent(saisie)}`,
      );
      expect(
        reponse.body.items.map((m: { numero: number }) => m.numero),
      ).toEqual([3]);
    }
    const parTexte = await get(tokenSecretaire, '?q=bureau');
    expect(
      parTexte.body.items.map((m: { numero: number }) => m.numero),
    ).toEqual([1]);
  });

  it('cache le prix d’achat à qui ne peut pas modifier', async () => {
    const m = await creer({
      designation: 'Ordinateur',
      categorie: 'Informatique',
      prixAchat: 450000,
      fournisseur: 'Dakar Info',
    });
    const secretaire = await get(tokenSecretaire, `/${m.id}`);
    expect(secretaire.body.prixAchat).toBe(450000);
    const lecteur = await get(tokenLecteur, `/${m.id}`);
    expect(lecteur.body.prixAchat).toBeNull();
    expect(lecteur.body.fournisseur).toBeNull();
    expect(JSON.stringify((await get(tokenLecteur, '')).body)).not.toContain(
      '450000',
    );
  });

  it('confie un objet, le fait revenir, et garde tout l’historique', async () => {
    const m = await creer({
      designation: 'Imprimante',
      categorie: 'Informatique',
      lieu: 'Secrétariat',
    });
    // Il faut désigner une seule cible.
    expect((await post(tokenSecretaire, `/${m.id}/affecter`, {})).status).toBe(
      400,
    );
    expect(
      (
        await post(tokenSecretaire, `/${m.id}/affecter`, {
          userId: idSecretaire,
          nom: 'Aussi un nom',
        })
      ).status,
    ).toBe(400);
    const confie = await post(tokenSecretaire, `/${m.id}/affecter`, {
      userId: idSecretaire,
    });
    expect(confie.status).toBe(201);
    expect(confie.body.statut).toBe('affecte');
    expect(confie.body.affectation.type).toBe('collaborateur');
    // Un objet confié se retrouve par collaborateur.
    const parPersonne = await get(
      tokenSecretaire,
      `?affecteAId=${idSecretaire}`,
    );
    expect(parPersonne.body.items.map((x: { id: string }) => x.id)).toContain(
      m.id,
    );
    // Transfert à un prestataire.
    const transfert = await post(tokenSecretaire, `/${m.id}/affecter`, {
      nom: 'Prestataire Sow',
    });
    expect(transfert.body.affectation).toMatchObject({
      type: 'libre',
      libelle: 'Prestataire Sow',
    });
    const retour = await post(tokenSecretaire, `/${m.id}/retour`, {
      etat: 'usage',
      lieu: 'Dépôt',
    });
    expect(retour.status).toBe(201);
    expect(retour.body).toMatchObject({
      statut: 'disponible',
      etat: 'usage',
      lieu: 'Dépôt',
      affectation: null,
    });
    // Pas de retour d'un objet qui n'est pas confié.
    expect((await post(tokenSecretaire, `/${m.id}/retour`, {})).status).toBe(
      409,
    );
    const resumes = (retour.body.historique as { type: string }[]).map(
      (h) => h.type,
    );
    expect(resumes).toEqual(
      expect.arrayContaining(['creation', 'affectation', 'retour']),
    );
  });

  it('suit les entretiens : prévu, immobilisation, retour en service, retard', async () => {
    const m = await creer({
      designation: 'Climatiseur',
      categorie: 'Climatisation',
    });
    const passe = '2026-01-10';
    const prevu = await post(tokenSecretaire, `/${m.id}/entretiens`, {
      type: 'preventif',
      description: 'Nettoyage des filtres',
      date: passe,
    });
    expect(prevu.status).toBe(201);
    expect(prevu.body.entretienEnRetard).toBe(true);
    expect(prevu.body.prochainEntretien).toContain(passe);
    const enRetard = await get(tokenSecretaire, '?filtre=entretien_a_prevoir');
    expect(enRetard.body.items.map((x: { id: string }) => x.id)).toContain(
      m.id,
    );
    // Une réparation immobilise l'objet.
    const reparation = await post(tokenSecretaire, `/${m.id}/entretiens`, {
      type: 'reparation',
      description: 'Compresseur',
      date: '2026-11-20',
      immobilise: true,
    });
    expect(reparation.body.statut).toBe('en_maintenance');
    // Un objet en maintenance ne se confie pas.
    expect(
      (await post(tokenSecretaire, `/${m.id}/affecter`, { nom: 'Quelqu’un' }))
        .status,
    ).toBe(409);
    const idReparation = (
      reparation.body.entretiens as { id: string; type: string }[]
    ).find((e) => e.type === 'reparation')!.id;
    const fini = await post(
      tokenSecretaire,
      `/${m.id}/entretiens/${idReparation}/terminer`,
      {
        cout: 85000,
        prestataire: 'Frigo Services',
        etat: 'bon',
      },
    );
    expect(fini.status).toBe(201);
    expect(fini.body.statut).toBe('disponible');
    expect(fini.body.etat).toBe('bon');
    // Un entretien terminé ne se termine pas deux fois, et un entretien « fait » ne peut pas être daté dans le futur.
    expect(
      (
        await post(
          tokenSecretaire,
          `/${m.id}/entretiens/${idReparation}/terminer`,
          {},
        )
      ).status,
    ).toBe(409);
    const futur = await post(tokenSecretaire, `/${m.id}/entretiens`, {
      type: 'controle',
      description: 'Déjà fait ?',
      date: '2030-01-01',
      fait: true,
    });
    expect(futur.status).toBe(400);
  });

  it('prévient une seule fois d’un entretien en retard', async () => {
    const rappels = app.get(MaterielRappelsService);
    const premier = await rappels.rappeler();
    expect(premier).toBeGreaterThan(0);
    expect(await rappels.rappeler()).toBe(0);
  });

  it('ajoute une photo de l’autocollant et refuse un fichier qui n’en est pas un', async () => {
    const m = await creer({ designation: 'Armoire' });
    const envoi = (contenu: Buffer, nom: string, type: string) =>
      request(app.getHttpServer())
        .post(`/api/materiel/${m.id}/fichiers`)
        .set('Authorization', `Bearer ${tokenSecretaire}`)
        .field('role', 'etiquette')
        .attach('file', contenu, { filename: nom, contentType: type });
    const ok = await envoi(PNG, 'etiquette.png', 'image/png');
    expect(ok.status).toBe(201);
    expect(ok.body.fichiers).toHaveLength(1);
    expect(ok.body.fichiers[0].role).toBe('etiquette');
    expect(
      (await envoi(Buffer.from('pas une image'), 'faux.png', 'image/png'))
        .status,
    ).toBe(400);
  });

  it('ne laisse sortir un objet du parc qu’à la Direction, avec un motif, sans rien supprimer', async () => {
    const m = await creer({ designation: 'Vieux ventilateur' });
    const corps = { type: 'reforme', motif: 'Moteur hors d’usage' };
    expect((await post(tokenSecretaire, `/${m.id}/sortie`, corps)).status).toBe(
      403,
    );
    expect(
      (
        await post(tokenDirection, `/${m.id}/sortie`, {
          type: 'reforme',
          motif: '',
        })
      ).status,
    ).toBe(400);
    const sorti = await post(tokenDirection, `/${m.id}/sortie`, corps);
    expect(sorti.status).toBe(201);
    expect(sorti.body.statut).toBe('sorti');
    expect(sorti.body.sortie).toMatchObject({
      type: 'reforme',
      motif: 'Moteur hors d’usage',
    });
    // La fiche reste consultable mais ne se modifie plus.
    expect((await get(tokenSecretaire, `/${m.id}`)).status).toBe(200);
    expect(
      (await patch(tokenSecretaire, `/${m.id}`, { notes: 'x' })).status,
    ).toBe(409);
    expect(
      (await post(tokenSecretaire, `/${m.id}/affecter`, { nom: 'x' })).status,
    ).toBe(409);
    // Il n'encombre plus la liste, sauf si on le demande.
    const actifs = await get(tokenSecretaire, '?q=ventilateur');
    expect(actifs.body.items).toHaveLength(0);
    const sortis = await get(tokenSecretaire, '?q=ventilateur&statut=sorti');
    expect(sortis.body.items).toHaveLength(1);
  });

  it('fait l’inventaire d’un lieu : conformes, déplacés, manquants et numéros inconnus', async () => {
    const a = await creer({ designation: 'Canapé accueil', lieu: 'Accueil' });
    const b = await creer({ designation: 'Table basse', lieu: 'Accueil' });
    const c = await creer({ designation: 'Lampe', lieu: 'Direction' });
    void b;
    const ouvert = await post(tokenSecretaire, '/inventaires', {
      lieu: 'Accueil',
    });
    expect(ouvert.status).toBe(201);
    const id = ouvert.body.id as string;
    // Un seul inventaire à la fois par lieu.
    expect(
      (await post(tokenSecretaire, '/inventaires', { lieu: 'Accueil' })).status,
    ).toBe(409);

    const saisir = (texte: string) =>
      post(tokenSecretaire, `/inventaires/${id}/numeros`, { numero: texte });
    expect(
      (await saisir(`MTM ${String(a.numero).padStart(4, '0')}`)).body.connu,
    ).toBe(true);
    expect((await saisir(String(c.numero))).body.connu).toBe(true);
    const inconnu = await saisir('9999');
    expect(inconnu.status).toBe(201);
    expect(inconnu.body.connu).toBe(false);
    expect((await saisir(String(a.numero))).status).toBe(409);
    expect((await saisir('abc')).status).toBe(400);

    const rapport = (await get(tokenSecretaire, `/inventaires/${id}`)).body;
    expect(rapport.conformes.map((x: { numero: number }) => x.numero)).toEqual([
      a.numero,
    ]);
    expect(
      rapport.deplaces.map((x: { numero: number; lieuFiche: string }) => [
        x.numero,
        x.lieuFiche,
      ]),
    ).toEqual([[c.numero, 'Direction']]);
    expect(rapport.manquants.map((x: { numero: number }) => x.numero)).toEqual([
      b.numero,
    ]);
    expect(rapport.inconnus.map((x: { numero: number }) => x.numero)).toEqual([
      9999,
    ]);

    const fini = await post(tokenSecretaire, `/inventaires/${id}/terminer`, {
      mettreAJourLieux: true,
    });
    expect(fini.status).toBe(201);
    expect(fini.body.statut).toBe('termine');
    // La lampe, trouvée à l'accueil, y est désormais rangée, et l'historique le dit.
    const lampe = await get(tokenSecretaire, `/${c.id}`);
    expect(lampe.body.lieu).toBe('Accueil');
    expect(JSON.stringify(lampe.body.historique)).toContain(
      "constaté à l'inventaire",
    );
    // Un inventaire terminé ne reçoit plus de numéros.
    expect((await saisir('1')).status).toBe(409);
  });

  it('résume le parc dans le tableau de bord', async () => {
    const t = (await get(tokenSecretaire, '/tableau')).body;
    expect(t.total).toBeGreaterThan(5);
    expect(t.parStatut.sorti).toBeGreaterThanOrEqual(1);
    expect(t.entretiensEnRetard).toBeGreaterThanOrEqual(1);
    expect(t.valeurAchat).toBeGreaterThanOrEqual(450000);
    // Le lecteur voit le parc mais pas sa valeur.
    expect((await get(tokenLecteur, '/tableau')).body.valeurAchat).toBeNull();
  });

  it('propose les collaborateurs et chantiers à qui confier un objet, à qui peut modifier seulement', async () => {
    const reponse = await get(tokenSecretaire, '/destinataires?q=secretaire');
    expect(reponse.status).toBe(200);
    expect(reponse.body).toEqual({
      collaborateurs: expect.any(Array),
      chantiers: expect.any(Array),
    });
    expect((await get(tokenLecteur, '/destinataires')).status).toBe(403);
  });
});
