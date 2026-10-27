// La limite de débit du formulaire public (5 par minute) est lue au chargement
// des contrôleurs : on la relève avant tout import, ce scénario enchaîne plus de
// demandes de séjour que n'en fait un visiteur.
process.env.CONTACT_RATE_LIMIT_MAX = '100';

import { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { createE2eApp, type E2eContext } from './helpers/e2e-app';
import { describeE2e } from './helpers/e2e-database';

/**
 * Location de courte durée et demandes de résiliation :
 *  - un bien se loue en courte durée : prix, ménage, caution, durée minimale ;
 *  - un séjour fige son prix, ne chevauche jamais un autre séjour confirmé ;
 *  - règlements, caution (retenue justifiée) et états des lieux d'entrée et de sortie ;
 *  - le site publie les dates prises et reçoit des demandes sans les confirmer ;
 *  - un locataire demande la résiliation de son bail, MTM l'accepte ou la refuse.
 */
describeE2e('Séjours de courte durée et résiliation (e2e)', () => {
  let app: INestApplication;
  let context: E2eContext;
  let data: E2eContext['data'];

  const MOT_DE_PASSE = 'Sejours-E2E-2026!';
  const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg==',
    'base64',
  );
  let jetonAgent = '';
  let jetonSansPayer = '';
  let jetonLocataire = '';
  let jetonAutreLocataire = '';
  let proprietaireId = '';
  let voyageurId = '';
  let bienNuitId = '';
  let bienMoisId = '';
  let bailId = '';
  let locataireId = '';

  /** Un jour décalé de `jours` par rapport à aujourd'hui, au format AAAA-MM-JJ. */
  const jour = (jours: number): string =>
    new Date(Date.now() + jours * 86_400_000).toISOString().slice(0, 10);
  const auth = (jeton: string) => ({ Authorization: `Bearer ${jeton}` });
  const api = () => request(app.getHttpServer());

  async function connexion(email: string): Promise<string> {
    const reponse = await api()
      .post('/api/auth/login')
      .send({ email, password: MOT_DE_PASSE });
    return reponse.body.accessToken as string;
  }

  const creerSejour = (corps: Record<string, unknown>, jeton = jetonAgent) =>
    api()
      .post('/api/locatif/sejours')
      .set(auth(jeton))
      .send({ bienLocatifId: bienNuitId, locataireId: voyageurId, ...corps });

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
    data = context.data;

    const gestion = await data.seedRoleWithPermissions(
      'responsable_gestion_locative',
      [
        'locatif:consulter',
        'locatif:creer',
        'locatif:modifier',
        'locatif:valider',
        'locatif:publier',
        'locatif:payer',
      ],
    );
    const agent = await data.seedUser({
      email: 'agent.sejours@mtm.test',
      password: await bcrypt.hash(MOT_DE_PASSE, 4),
      firstName: 'Fatou',
      lastName: 'Sarr',
    });
    await data.linkUserRole(agent.id, gestion.id);
    jetonAgent = await connexion('agent.sejours@mtm.test');

    // Un collaborateur qui gère les séjours sans manier l'argent.
    const sansPayer = await data.seedRoleWithPermissions('manager', [
      'locatif:consulter',
      'locatif:creer',
      'locatif:modifier',
    ]);
    const assistant = await data.seedUser({
      email: 'assistant.sejours@mtm.test',
      password: await bcrypt.hash(MOT_DE_PASSE, 4),
      firstName: 'Awa',
      lastName: 'Ndiaye',
    });
    await data.linkUserRole(assistant.id, sansPayer.id);
    jetonSansPayer = await connexion('assistant.sejours@mtm.test');

    const proprietaire = await data.seedProprietaire({
      firstName: 'Moussa',
      lastName: 'Kane',
      email: 'moussa.kane@example.com',
    });
    proprietaireId = proprietaire.id;

    const voyageur = await context.prisma.locataire.create({
      data: { firstName: 'Julie', lastName: 'Martin', phone: '+33611223344' },
    });
    voyageurId = voyageur.id;

    const locataire = await context.prisma.locataire.create({
      data: {
        firstName: 'Aissatou',
        lastName: 'Ba',
        email: 'aissatou.ba@example.com',
      },
    });
    locataireId = locataire.id;
    const roleClient = await data.seedRoleWithPermissions('client', []);
    const compte = await data.seedUser({
      email: 'aissatou.ba@example.com',
      password: await bcrypt.hash(MOT_DE_PASSE, 4),
      firstName: 'Aissatou',
      lastName: 'Ba',
      clientLocataireId: locataire.id,
    });
    await data.linkUserRole(compte.id, roleClient.id);
    jetonLocataire = await connexion('aissatou.ba@example.com');

    const autre = await context.prisma.locataire.create({
      data: {
        firstName: 'Ibrahima',
        lastName: 'Diop',
        email: 'ibrahima.diop@example.com',
      },
    });
    const compteAutre = await data.seedUser({
      email: 'ibrahima.diop@example.com',
      password: await bcrypt.hash(MOT_DE_PASSE, 4),
      firstName: 'Ibrahima',
      lastName: 'Diop',
      clientLocataireId: autre.id,
    });
    await data.linkUserRole(compteAutre.id, roleClient.id);
    jetonAutreLocataire = await connexion('ibrahima.diop@example.com');
  });

  afterAll(async () => {
    await context.close();
  });

  // ---------------------------------------------------------------------
  // Le bien en courte durée
  // ---------------------------------------------------------------------

  it('crée un bien en courte durée, avec prix de la nuit, ménage et caution', async () => {
    const reponse = await api()
      .post('/api/locatif/biens')
      .set(auth(jetonAgent))
      .send({
        proprietaireId,
        type: 'appartement',
        adresse: 'Almadies, résidence Les Palmiers',
        commune: 'Ngor',
        region: 'Dakar',
        titre: 'Appartement vue mer',
        modeLocation: 'courte_duree',
        prixNuit: 45000,
        fraisMenage: 10000,
        cautionSejour: 100000,
        nuitsMinimum: 2,
        capaciteVoyageurs: 4,
        heureArrivee: '15:00',
        heureDepart: '11:00',
      });
    expect(reponse.status).toBe(201);
    expect(reponse.body).toMatchObject({
      modeLocation: 'courte_duree',
      nuitsMinimum: 2,
      capaciteVoyageurs: 4,
      heureArrivee: '15:00',
    });
    expect(Number(reponse.body.prixNuit)).toBe(45000);
    bienNuitId = reponse.body.id;
  });

  it('refuse un mode de location ou une heure invalides', async () => {
    const mode = await api()
      .patch(`/api/locatif/biens/${bienNuitId}`)
      .set(auth(jetonAgent))
      .send({ modeLocation: 'weekend' });
    expect(mode.status).toBe(400);
    const heure = await api()
      .patch(`/api/locatif/biens/${bienNuitId}`)
      .set(auth(jetonAgent))
      .send({ heureArrivee: '25:99' });
    expect(heure.status).toBe(400);
  });

  it('refuse un bail sur un bien en courte durée', async () => {
    const reponse = await api()
      .post(`/api/locatif/biens/${bienNuitId}/baux`)
      .set(auth(jetonAgent))
      .send({ locataireId, loyerMensuel: 150000, dateDebut: jour(1) });
    expect(reponse.status).toBe(400);
    expect(reponse.body.message).toMatch(/courte durée/);
  });

  it('refuse un séjour sur un bien loué au mois', async () => {
    const bien = await api()
      .post('/api/locatif/biens')
      .set(auth(jetonAgent))
      .send({
        proprietaireId,
        type: 'villa',
        adresse: 'Mermoz, villa 3',
        loyerMensuel: 250000,
      });
    bienMoisId = bien.body.id;
    const reponse = await creerSejour({
      bienLocatifId: bienMoisId,
      dateArrivee: jour(10),
      dateDepart: jour(13),
    });
    expect(reponse.status).toBe(400);
    expect(reponse.body.message).toMatch(/au mois/);
  });

  // ---------------------------------------------------------------------
  // Les séjours
  // ---------------------------------------------------------------------

  let sejourId = '';

  it('crée un séjour : prix figé, nuits et total calculés, référence lisible', async () => {
    const reponse = await creerSejour({
      dateArrivee: jour(10),
      dateDepart: jour(13),
      nombreVoyageurs: 2,
      source: 'airbnb',
    });
    expect(reponse.status).toBe(201);
    expect(reponse.body.referenceInterne).toMatch(/^SJ-\d{4}-\d{4}$/);
    expect(reponse.body).toMatchObject({
      nuits: 3,
      statut: 'confirmee',
      source: 'airbnb',
      cautionStatut: 'non_versee',
    });
    // 3 nuits × 45 000 + 10 000 de ménage.
    expect(Number(reponse.body.montantTotal)).toBe(145000);
    expect(Number(reponse.body.cautionMontant)).toBe(100000);
    expect(reponse.body.synthese).toMatchObject({
      statut: 'non_regle',
      reste: 145000,
    });
    sejourId = reponse.body.id;
  });

  it('le tarif du séjour ne bouge pas quand le prix du bien change', async () => {
    await api()
      .patch(`/api/locatif/biens/${bienNuitId}`)
      .set(auth(jetonAgent))
      .send({ prixNuit: 60000 });
    const fiche = await api()
      .get(`/api/locatif/sejours/${sejourId}`)
      .set(auth(jetonAgent));
    expect(Number(fiche.body.prixNuit)).toBe(45000);
    expect(Number(fiche.body.montantTotal)).toBe(145000);
    await api()
      .patch(`/api/locatif/biens/${bienNuitId}`)
      .set(auth(jetonAgent))
      .send({ prixNuit: 45000 });
  });

  it('refuse un séjour qui chevauche un séjour confirmé, accepte un départ et une arrivée le même jour', async () => {
    const chevauche = await creerSejour({
      dateArrivee: jour(12),
      dateDepart: jour(15),
    });
    expect(chevauche.status).toBe(409);
    expect(chevauche.body.message).toMatch(/déjà réservé/);

    const colle = await creerSejour({
      dateArrivee: jour(13),
      dateDepart: jour(15),
    });
    expect(colle.status).toBe(201);
    expect(colle.body.nuits).toBe(2);
  });

  it('refuse une durée trop courte, un trop grand groupe et des dates inversées', async () => {
    const courte = await creerSejour({
      dateArrivee: jour(30),
      dateDepart: jour(31),
    });
    expect(courte.status).toBe(400);
    expect(courte.body.message).toMatch(/2 nuits minimum/);
    const groupe = await creerSejour({
      dateArrivee: jour(30),
      dateDepart: jour(33),
      nombreVoyageurs: 9,
    });
    expect(groupe.status).toBe(400);
    expect(groupe.body.message).toMatch(/4 voyageurs au plus/);
    const inverse = await creerSejour({
      dateArrivee: jour(33),
      dateDepart: jour(30),
    });
    expect(inverse.status).toBe(400);
  });

  it('modifie un séjour à venir : dates, prix et total recalculés, chevauchement revérifié', async () => {
    const reponse = await api()
      .patch(`/api/locatif/sejours/${sejourId}`)
      .set(auth(jetonAgent))
      .send({ dateDepart: jour(12), remise: 5000 });
    expect(reponse.status).toBe(200);
    // 2 nuits × 45 000 + 10 000 − 5 000.
    expect(Number(reponse.body.montantTotal)).toBe(95000);
    expect(reponse.body.nuits).toBe(2);

    const conflit = await api()
      .patch(`/api/locatif/sejours/${sejourId}`)
      .set(auth(jetonAgent))
      .send({ dateDepart: jour(14) });
    expect(conflit.status).toBe(409);

    await api()
      .patch(`/api/locatif/sejours/${sejourId}`)
      .set(auth(jetonAgent))
      .send({ dateDepart: jour(13), remise: 0 });
  });

  // ---------------------------------------------------------------------
  // Règlements et caution
  // ---------------------------------------------------------------------

  it('enregistre un acompte puis le solde ; refuse de dépasser le reste à payer', async () => {
    const acompte = await api()
      .post(`/api/locatif/sejours/${sejourId}/paiements`)
      .set(auth(jetonAgent))
      .send({ montant: 50000, mode: 'mobile_money', reference: 'WAVE-123' });
    expect(acompte.status).toBe(201);
    expect(acompte.body.synthese).toMatchObject({
      statut: 'acompte',
      reste: 95000,
    });
    expect(acompte.body.paiements[0].type).toBe('acompte');

    const trop = await api()
      .post(`/api/locatif/sejours/${sejourId}/paiements`)
      .set(auth(jetonAgent))
      .send({ montant: 100000, mode: 'especes' });
    expect(trop.status).toBe(400);
    expect(trop.body.message).toMatch(/reste à payer/);

    const solde = await api()
      .post(`/api/locatif/sejours/${sejourId}/paiements`)
      .set(auth(jetonAgent))
      .send({ montant: 95000, mode: 'especes' });
    expect(solde.status).toBe(201);
    expect(solde.body.synthese).toMatchObject({ statut: 'solde', reste: 0 });
    expect(solde.body.paiements[1].type).toBe('solde');
  });

  it('encaisser un règlement demande la permission « payer »', async () => {
    const reponse = await api()
      .post(`/api/locatif/sejours/${sejourId}/paiements`)
      .set(auth(jetonSansPayer))
      .send({ montant: 1000, mode: 'especes' });
    expect(reponse.status).toBe(403);
  });

  it('enregistre la caution versée', async () => {
    const reponse = await api()
      .post(`/api/locatif/sejours/${sejourId}/caution/verser`)
      .set(auth(jetonAgent))
      .send({});
    expect(reponse.status).toBe(201);
    expect(reponse.body.cautionStatut).toBe('versee');
    const encore = await api()
      .post(`/api/locatif/sejours/${sejourId}/caution/verser`)
      .set(auth(jetonAgent))
      .send({});
    expect(encore.status).toBe(400);
  });

  // ---------------------------------------------------------------------
  // États des lieux et déroulé du séjour
  // ---------------------------------------------------------------------

  const piecesEntree = [
    { piece: 'Salon', etat: 'bon' },
    { piece: 'Cuisine', etat: 'bon' },
    { piece: 'Chambre 1', etat: 'usage' },
  ];

  it('l’état des lieux de sortie attend l’arrivée du voyageur', async () => {
    const reponse = await api()
      .put(`/api/locatif/sejours/${sejourId}/etats-des-lieux/sortie`)
      .set(auth(jetonAgent))
      .send({ pieces: piecesEntree });
    expect(reponse.status).toBe(400);
    expect(reponse.body.message).toMatch(/arrivé/);
  });

  it('enregistre l’état des lieux d’entrée, y ajoute une photo, puis la corrige', async () => {
    const reponse = await api()
      .put(`/api/locatif/sejours/${sejourId}/etats-des-lieux/entree`)
      .set(auth(jetonAgent))
      .send({
        pieces: piecesEntree,
        releveEau: '1234',
        releveElectricite: '9876',
        nombreCles: 2,
        signataire: 'Julie Martin',
      });
    expect(reponse.status).toBe(200);
    expect(reponse.body.entree).toMatchObject({
      nombreCles: 2,
      signataire: 'Julie Martin',
    });
    expect(reponse.body.entree.pieces).toHaveLength(3);
    const etatId = reponse.body.entree.id as string;

    const photo = await api()
      .post(`/api/locatif/etats-des-lieux/${etatId}/photos`)
      .set(auth(jetonAgent))
      .field('legende', 'Salon')
      .attach('file', PNG, { filename: 'salon.png', contentType: 'image/png' });
    expect(photo.status).toBe(201);
    expect(photo.body.entree.photos).toHaveLength(1);
    expect(photo.body.entree.photos[0].legende).toBe('Salon');

    // Réenregistrer le même type corrige l'état des lieux : il n'y en a toujours qu'un.
    const correction = await api()
      .put(`/api/locatif/sejours/${sejourId}/etats-des-lieux/entree`)
      .set(auth(jetonAgent))
      .send({ pieces: [...piecesEntree, { piece: 'WC', etat: 'bon' }] });
    expect(correction.body.entree.id).toBe(etatId);
    expect(correction.body.entree.pieces).toHaveLength(4);
    expect(correction.body.entree.photos).toHaveLength(1);
  });

  it('refuse une pièce dans un état inconnu, ou un état des lieux sans pièce', async () => {
    const inconnu = await api()
      .put(`/api/locatif/sejours/${sejourId}/etats-des-lieux/entree`)
      .set(auth(jetonAgent))
      .send({ pieces: [{ piece: 'Salon', etat: 'super' }] });
    expect(inconnu.status).toBe(400);
    const vide = await api()
      .put(`/api/locatif/sejours/${sejourId}/etats-des-lieux/entree`)
      .set(auth(jetonAgent))
      .send({ pieces: [] });
    expect(vide.status).toBe(400);
  });

  it('suit le déroulé : arrivée, départ ; on ne revient pas en arrière ni ne saute d’étape', async () => {
    const saut = await api()
      .patch(`/api/locatif/sejours/${sejourId}/statut`)
      .set(auth(jetonAgent))
      .send({ statut: 'terminee' });
    expect(saut.status).toBe(400);

    const arrivee = await api()
      .patch(`/api/locatif/sejours/${sejourId}/statut`)
      .set(auth(jetonAgent))
      .send({ statut: 'en_cours' });
    expect(arrivee.status).toBe(200);
    expect(arrivee.body.statut).toBe('en_cours');

    // Le voyageur est arrivé : on ne peut plus annuler, seulement terminer.
    const annulation = await api()
      .post(`/api/locatif/sejours/${sejourId}/annuler`)
      .set(auth(jetonAgent))
      .send({ motif: 'Changement de projet' });
    expect(annulation.status).toBe(400);
    const modif = await api()
      .patch(`/api/locatif/sejours/${sejourId}`)
      .set(auth(jetonAgent))
      .send({ notes: 'tard' });
    expect(modif.status).toBe(400);
  });

  it('compare l’état de sortie à celui d’entrée et repère les dégradations', async () => {
    const sortie = await api()
      .put(`/api/locatif/sejours/${sejourId}/etats-des-lieux/sortie`)
      .set(auth(jetonAgent))
      .send({
        pieces: [
          {
            piece: 'salon',
            etat: 'degrade',
            observation: 'Tache sur le canapé',
          },
          { piece: 'Cuisine', etat: 'bon' },
          { piece: 'Chambre 1', etat: 'usage' },
          { piece: 'WC', etat: 'bon' },
        ],
      });
    expect(sortie.status).toBe(200);
    expect(sortie.body.degradations).toBe(1);
    expect(
      sortie.body.comparaison.find(
        (ligne: { piece: string }) => ligne.piece === 'salon',
      ),
    ).toMatchObject({
      avant: 'bon',
      apres: 'degrade',
      degradation: true,
    });
  });

  it('termine le séjour, puis restitue la caution avec une retenue justifiée', async () => {
    const termine = await api()
      .patch(`/api/locatif/sejours/${sejourId}/statut`)
      .set(auth(jetonAgent))
      .send({ statut: 'terminee' });
    expect(termine.body.statut).toBe('terminee');

    const aRegler = await api()
      .get('/api/locatif/sejours?vue=caution_a_regler')
      .set(auth(jetonAgent));
    expect(aRegler.body.items.map((s: { id: string }) => s.id)).toContain(
      sejourId,
    );

    // Rendre une caution est une sortie d'argent : « payer » est exigé.
    const sansDroit = await api()
      .post(`/api/locatif/sejours/${sejourId}/caution/restituer`)
      .set(auth(jetonSansPayer))
      .send({});
    expect(sansDroit.status).toBe(403);

    const sansMotif = await api()
      .post(`/api/locatif/sejours/${sejourId}/caution/restituer`)
      .set(auth(jetonAgent))
      .send({ retenue: 20000 });
    expect(sansMotif.status).toBe(400);
    const tropGrosse = await api()
      .post(`/api/locatif/sejours/${sejourId}/caution/restituer`)
      .set(auth(jetonAgent))
      .send({ retenue: 500000, justification: 'Dégâts' });
    expect(tropGrosse.status).toBe(400);

    const rendue = await api()
      .post(`/api/locatif/sejours/${sejourId}/caution/restituer`)
      .set(auth(jetonAgent))
      .send({
        retenue: 20000,
        justification: 'Nettoyage du canapé constaté à la sortie',
      });
    expect(rendue.status).toBe(201);
    expect(rendue.body).toMatchObject({
      cautionStatut: 'partiellement_retenue',
    });
    expect(Number(rendue.body.cautionRetenue)).toBe(20000);

    const deuxFois = await api()
      .post(`/api/locatif/sejours/${sejourId}/caution/restituer`)
      .set(auth(jetonAgent))
      .send({});
    expect(deuxFois.status).toBe(400);
  });

  // ---------------------------------------------------------------------
  // Annulation et statistiques
  // ---------------------------------------------------------------------

  it('annule un séjour avec un motif ; un séjour annulé libère les nuits', async () => {
    const colle = await api()
      .get('/api/locatif/sejours?statut=confirmee')
      .set(auth(jetonAgent));
    const aAnnuler = colle.body.items[0] as { id: string };

    const sansMotif = await api()
      .post(`/api/locatif/sejours/${aAnnuler.id}/annuler`)
      .set(auth(jetonAgent))
      .send({});
    expect(sansMotif.status).toBe(400);

    const annule = await api()
      .post(`/api/locatif/sejours/${aAnnuler.id}/annuler`)
      .set(auth(jetonAgent))
      .send({ motif: 'Vol annulé' });
    expect(annule.body).toMatchObject({
      statut: 'annulee',
      motifAnnulation: 'Vol annulé',
    });

    const reprise = await creerSejour({
      dateArrivee: jour(13),
      dateDepart: jour(15),
    });
    expect(reprise.status).toBe(201);
  });

  // ---------------------------------------------------------------------
  // Le site public
  // ---------------------------------------------------------------------

  it('un bien sans photo ne se publie pas ; une fois publié, le site voit son tarif par nuit', async () => {
    const sansPhoto = await api()
      .patch(`/api/locatif/biens/${bienNuitId}`)
      .set(auth(jetonAgent))
      .send({ publie: true });
    expect(sansPhoto.status).toBe(400);
    expect(sansPhoto.body.message).toMatch(/photo/);

    await api()
      .post(`/api/locatif/biens/${bienNuitId}/medias`)
      .set(auth(jetonAgent))
      .attach('file', PNG, { filename: 'bien.png', contentType: 'image/png' });
    const publie = await api()
      .patch(`/api/locatif/biens/${bienNuitId}`)
      .set(auth(jetonAgent))
      .send({ publie: true });
    expect(publie.status).toBe(200);

    const catalogue = await api().get(
      '/api/locatif/public/biens?mode=courte_duree',
    );
    expect(catalogue.body.items).toHaveLength(1);
    expect(catalogue.body.items[0]).toMatchObject({
      modeLocation: 'courte_duree',
      prixNuit: 45000,
      fraisMenage: 10000,
      montantCaution: 100000,
      nuitsMinimum: 2,
      capaciteVoyageurs: 4,
    });
    const longue = await api().get(
      '/api/locatif/public/biens?mode=longue_duree',
    );
    expect(longue.body.items).toHaveLength(0);
    // Jamais de donnée interne : propriétaire, adresse exacte.
    const brut = JSON.stringify(catalogue.body);
    expect(brut).not.toContain('Almadies, résidence');
    expect(brut).not.toContain('proprietaire');
  });

  it('publie les nuits prises, sans dire par qui', async () => {
    const reponse = await api().get(
      `/api/locatif/public/biens/${bienNuitId}/disponibilites`,
    );
    expect(reponse.status).toBe(200);
    expect(reponse.body).toEqual([{ debut: jour(13), fin: jour(15) }]);
    expect(JSON.stringify(reponse.body)).not.toContain('Julie');
  });

  let demandeRef = '';

  it('reçoit une demande de séjour du site, sans bloquer le calendrier', async () => {
    const reponse = await api()
      .post(`/api/locatif/public/biens/${bienNuitId}/sejours/demande`)
      .send({
        prenom: 'Marc',
        nom: 'Dupont',
        telephone: '+33 6 99 88 77 66',
        email: 'marc.dupont@example.com',
        dateArrivee: jour(20),
        dateDepart: jour(23),
        nombreVoyageurs: 2,
        message: 'Arrivée tardive vers 22 h',
      });
    expect(reponse.status).toBe(201);
    expect(reponse.body).toMatchObject({
      nuits: 3,
      prixNuit: 45000,
      montantTotal: 145000,
      cautionMontant: 100000,
    });
    expect(reponse.body.reference).toMatch(/^SJ-\d{4}-\d{4}$/);
    demandeRef = reponse.body.reference;

    // La demande est à traiter, avec son voyageur ; les nuits restent libres.
    const aTraiter = await api()
      .get('/api/locatif/sejours?vue=a_traiter')
      .set(auth(jetonAgent));
    expect(aTraiter.body.items).toHaveLength(1);
    expect(aTraiter.body.items[0]).toMatchObject({
      referenceInterne: demandeRef,
      statut: 'demande',
      source: 'site',
    });
    expect(aTraiter.body.items[0].locataire.lastName).toBe('Dupont');
    const dispo = await api().get(
      `/api/locatif/public/biens/${bienNuitId}/disponibilites`,
    );
    expect(dispo.body).toEqual([{ debut: jour(13), fin: jour(15) }]);

    // Le personnel est prévenu.
    const notifications = await context.prisma.notification.findMany({
      where: { type: 'sejour_demande' },
    });
    expect(notifications.length).toBeGreaterThan(0);
  });

  it('une demande répétée ne crée pas de doublon', async () => {
    const encore = await api()
      .post(`/api/locatif/public/biens/${bienNuitId}/sejours/demande`)
      .send({
        prenom: 'Marc',
        nom: 'Dupont',
        telephone: '+33699887766',
        dateArrivee: jour(20),
        dateDepart: jour(23),
        nombreVoyageurs: 2,
      });
    expect(encore.status).toBe(201);
    expect(encore.body.reference).toBe(demandeRef);
    const aTraiter = await api()
      .get('/api/locatif/sejours?vue=a_traiter')
      .set(auth(jetonAgent));
    expect(aTraiter.body.items).toHaveLength(1);
    // Même téléphone : une seule fiche voyageur.
    expect(
      await context.prisma.locataire.count({ where: { lastName: 'Dupont' } }),
    ).toBe(1);
  });

  it('refuse sur le site des dates prises, passées ou trop courtes, et un bien non publié', async () => {
    const corps = {
      prenom: 'A',
      nom: 'B',
      telephone: '+221770000000',
      nombreVoyageurs: 1,
    };
    const prises = await api()
      .post(`/api/locatif/public/biens/${bienNuitId}/sejours/demande`)
      .send({ ...corps, dateArrivee: jour(13), dateDepart: jour(15) });
    expect(prises.status).toBe(409);
    const passees = await api()
      .post(`/api/locatif/public/biens/${bienNuitId}/sejours/demande`)
      .send({ ...corps, dateArrivee: jour(-5), dateDepart: jour(-2) });
    expect(passees.status).toBe(400);
    const courte = await api()
      .post(`/api/locatif/public/biens/${bienNuitId}/sejours/demande`)
      .send({ ...corps, dateArrivee: jour(40), dateDepart: jour(41) });
    expect(courte.status).toBe(400);
    const nonPublie = await api()
      .post(`/api/locatif/public/biens/${bienMoisId}/sejours/demande`)
      .send({ ...corps, dateArrivee: jour(40), dateDepart: jour(43) });
    expect(nonPublie.status).toBe(404);
  });

  it('confirmer la demande occupe les nuits ; une autre demande sur ces dates ne peut plus l’être', async () => {
    const aTraiter = await api()
      .get('/api/locatif/sejours?vue=a_traiter')
      .set(auth(jetonAgent));
    const demande = aTraiter.body.items[0] as { id: string };
    // Une réservation directe prend les mêmes nuits entre-temps.
    const directe = await creerSejour({
      dateArrivee: jour(21),
      dateDepart: jour(24),
    });
    expect(directe.status).toBe(201);

    const confirmation = await api()
      .patch(`/api/locatif/sejours/${demande.id}/statut`)
      .set(auth(jetonAgent))
      .send({ statut: 'confirmee' });
    expect(confirmation.status).toBe(409);

    await api()
      .post(`/api/locatif/sejours/${directe.body.id}/annuler`)
      .set(auth(jetonAgent))
      .send({ motif: 'Doublon' });
    const ok = await api()
      .patch(`/api/locatif/sejours/${demande.id}/statut`)
      .set(auth(jetonAgent))
      .send({ statut: 'confirmee' });
    expect(ok.status).toBe(200);
    const dispo = await api().get(
      `/api/locatif/public/biens/${bienNuitId}/disponibilites`,
    );
    expect(dispo.body).toContainEqual({ debut: jour(20), fin: jour(23) });
  });

  it('deux confirmations simultanées des mêmes nuits : une seule aboutit', async () => {
    const dates = {
      dateArrivee: jour(60),
      dateDepart: jour(63),
      nombreVoyageurs: 2,
    };
    const demande = (prenom: string, telephone: string) =>
      api()
        .post(`/api/locatif/public/biens/${bienNuitId}/sejours/demande`)
        .send({ prenom, nom: 'Concurrent', telephone, ...dates });
    const [a, b] = await Promise.all([
      demande('Alice', '+33700000001'),
      demande('Bruno', '+33700000002'),
    ]);
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(a.body.reference).not.toBe(b.body.reference);

    const ids = (
      await api()
        .get('/api/locatif/sejours?vue=a_traiter')
        .set(auth(jetonAgent))
    ).body.items
      .filter(
        (s: { locataire: { lastName: string } }) =>
          s.locataire.lastName === 'Concurrent',
      )
      .map((s: { id: string }) => s.id);
    expect(ids).toHaveLength(2);

    const resultats = await Promise.all(
      ids.map((id: string) =>
        api()
          .patch(`/api/locatif/sejours/${id}/statut`)
          .set(auth(jetonAgent))
          .send({ statut: 'confirmee' }),
      ),
    );
    expect(resultats.map((r) => r.status).sort()).toEqual([200, 409]);
    // Le bien n'est occupé qu'une fois sur ces nuits.
    const dispo = await api().get(
      `/api/locatif/public/biens/${bienNuitId}/disponibilites`,
    );
    expect(
      dispo.body.filter((p: { debut: string }) => p.debut === jour(60)),
    ).toHaveLength(1);
  });

  it('compte ce qui attend MTM', async () => {
    const stats = await api()
      .get('/api/locatif/sejours/stats')
      .set(auth(jetonAgent));
    expect(stats.status).toBe(200);
    expect(stats.body).toEqual(
      expect.objectContaining({
        aTraiter: expect.any(Number),
        arriveesProches: expect.any(Number),
        enCours: expect.any(Number),
        cautionsARegler: expect.any(Number),
      }),
    );
  });

  it('ne laisse pas repasser un bien en location au mois quand des séjours l’attendent', async () => {
    const reponse = await api()
      .patch(`/api/locatif/biens/${bienNuitId}`)
      .set(auth(jetonAgent))
      .send({ modeLocation: 'longue_duree' });
    expect(reponse.status).toBe(409);
  });

  // ---------------------------------------------------------------------
  // Demande de résiliation de bail
  // ---------------------------------------------------------------------

  let demandeId = '';

  it('prépare un bail actif sur le bien loué au mois', async () => {
    const reponse = await api()
      .post(`/api/locatif/biens/${bienMoisId}/baux`)
      .set(auth(jetonAgent))
      .send({
        locataireId,
        loyerMensuel: 250000,
        jourEcheance: 5,
        dateDebut: jour(-60),
      });
    expect(reponse.status).toBe(201);
    bailId = reponse.body.id;
  });

  it('le locataire demande la résiliation de son bail depuis son espace', async () => {
    const reponse = await api()
      .post(`/api/locatif/locataire/baux/${bailId}/resiliation`)
      .set(auth(jetonLocataire))
      .send({
        dateDepartSouhaitee: jour(45),
        motif: 'demenagement',
        message: 'Je pars travailler à Thiès.',
      });
    expect(reponse.status).toBe(201);
    expect(reponse.body).toMatchObject({
      statut: 'en_attente',
      canal: 'portail',
      motif: 'demenagement',
    });
    demandeId = reponse.body.id;

    const liste = await api()
      .get('/api/locatif/locataire/resiliations')
      .set(auth(jetonLocataire));
    expect(liste.body.demandes).toHaveLength(1);
    expect(liste.body.preavisJours).toBe(30);

    const notifications = await context.prisma.notification.findMany({
      where: { type: 'resiliation_demande' },
    });
    expect(notifications.length).toBeGreaterThan(0);
  });

  it('refuse une seconde demande en attente, un motif inconnu, une date passée', async () => {
    const doublon = await api()
      .post(`/api/locatif/locataire/baux/${bailId}/resiliation`)
      .set(auth(jetonLocataire))
      .send({ dateDepartSouhaitee: jour(60) });
    expect(doublon.status).toBe(409);
  });

  it('un autre locataire ne peut ni demander sur ce bail ni voir la demande', async () => {
    const demande = await api()
      .post(`/api/locatif/locataire/baux/${bailId}/resiliation`)
      .set(auth(jetonAutreLocataire))
      .send({ dateDepartSouhaitee: jour(60) });
    expect(demande.status).toBe(404);
    const liste = await api()
      .get('/api/locatif/locataire/resiliations')
      .set(auth(jetonAutreLocataire));
    expect(liste.body.demandes).toEqual([]);
    const retrait = await api()
      .delete(`/api/locatif/locataire/resiliations/${demandeId}`)
      .set(auth(jetonAutreLocataire));
    expect(retrait.status).toBe(404);
  });

  it('MTM voit la demande à traiter', async () => {
    const stats = await api()
      .get('/api/locatif/resiliations/stats')
      .set(auth(jetonAgent));
    expect(stats.body).toMatchObject({ enAttente: 1, preavisJours: 30 });
    const liste = await api()
      .get('/api/locatif/resiliations?statut=en_attente')
      .set(auth(jetonAgent));
    expect(liste.body.items).toHaveLength(1);
    expect(liste.body.items[0].bailLocatif.locataire.lastName).toBe('Ba');
  });

  it('refuser demande une explication', async () => {
    const sansMotif = await api()
      .patch(`/api/locatif/resiliations/${demandeId}/traiter`)
      .set(auth(jetonAgent))
      .send({ decision: 'refusee' });
    expect(sansMotif.status).toBe(400);
  });

  it('accepter ouvre le préavis du bail à la date retenue et prévient le locataire', async () => {
    const reponse = await api()
      .patch(`/api/locatif/resiliations/${demandeId}/traiter`)
      .set(auth(jetonAgent))
      .send({
        decision: 'acceptee',
        reponse: 'Départ accepté, état des lieux à prévoir.',
      });
    expect(reponse.status).toBe(200);
    expect(reponse.body.statut).toBe('acceptee');
    // Sans date imposée : la plus tardive entre le souhait (J+45) et la demande + 30 jours.
    expect(String(reponse.body.dateDepartRetenue).slice(0, 10)).toBe(jour(45));

    const bail = await api()
      .get(`/api/locatif/baux/${bailId}`)
      .set(auth(jetonAgent));
    expect(bail.body.statut).toBe('preavis');
    expect(String(bail.body.preavisDepartPrevu).slice(0, 10)).toBe(jour(45));

    const notification = await context.prisma.notification.findFirst({
      where: { type: 'resiliation_traitee' },
    });
    expect(notification?.titre).toMatch(/acceptée/);

    const dejaTraitee = await api()
      .patch(`/api/locatif/resiliations/${demandeId}/traiter`)
      .set(auth(jetonAgent))
      .send({ decision: 'refusee', reponse: 'Trop tard pour changer' });
    expect(dejaTraitee.status).toBe(400);

    // Le préavis est ouvert : plus de nouvelle demande pour ce bail.
    const encore = await api()
      .post(`/api/locatif/locataire/baux/${bailId}/resiliation`)
      .set(auth(jetonLocataire))
      .send({ dateDepartSouhaitee: jour(90) });
    expect(encore.status).toBe(400);
  });

  it('MTM enregistre une demande reçue par téléphone, puis la refuse avec une raison', async () => {
    const bien = await api()
      .post('/api/locatif/biens')
      .set(auth(jetonAgent))
      .send({
        proprietaireId,
        type: 'studio',
        adresse: 'Ouakam, studio 2',
        loyerMensuel: 120000,
      });
    const bail = await api()
      .post(`/api/locatif/biens/${bien.body.id}/baux`)
      .set(auth(jetonAgent))
      .send({
        locataireId,
        loyerMensuel: 120000,
        jourEcheance: 5,
        dateDebut: jour(-30),
      });

    const demande = await api()
      .post(`/api/locatif/resiliations/baux/${bail.body.id}`)
      .set(auth(jetonAgent))
      .send({
        dateDepartSouhaitee: jour(40),
        canal: 'telephone',
        motif: 'achat',
      });
    expect(demande.status).toBe(201);
    expect(demande.body).toMatchObject({
      canal: 'telephone',
      statut: 'en_attente',
    });

    const canalInconnu = await api()
      .post(`/api/locatif/resiliations/baux/${bail.body.id}`)
      .set(auth(jetonAgent))
      .send({ dateDepartSouhaitee: jour(40), canal: 'pigeon' });
    expect(canalInconnu.status).toBe(400);

    const refus = await api()
      .patch(`/api/locatif/resiliations/${demande.body.id}/traiter`)
      .set(auth(jetonAgent))
      .send({
        decision: 'refusee',
        reponse: 'Le bail court jusqu’à son terme : merci de nous contacter.',
      });
    expect(refus.status).toBe(200);
    expect(refus.body.statut).toBe('refusee');

    // Refusée, la demande n'ouvre aucun préavis.
    const fiche = await api()
      .get(`/api/locatif/baux/${bail.body.id}`)
      .set(auth(jetonAgent));
    expect(fiche.body.statut).toBe('actif');
  });

  it('le locataire retire sa demande tant qu’elle n’est pas traitée', async () => {
    const bien = await api()
      .post('/api/locatif/biens')
      .set(auth(jetonAgent))
      .send({
        proprietaireId,
        type: 'studio',
        adresse: 'Yoff, studio 5',
        loyerMensuel: 100000,
      });
    const bail = await api()
      .post(`/api/locatif/biens/${bien.body.id}/baux`)
      .set(auth(jetonAgent))
      .send({
        locataireId,
        loyerMensuel: 100000,
        jourEcheance: 5,
        dateDebut: jour(-10),
      });
    const demande = await api()
      .post(`/api/locatif/locataire/baux/${bail.body.id}/resiliation`)
      .set(auth(jetonLocataire))
      .send({ dateDepartSouhaitee: jour(50) });
    expect(demande.status).toBe(201);

    const retrait = await api()
      .delete(`/api/locatif/locataire/resiliations/${demande.body.id}`)
      .set(auth(jetonLocataire));
    expect(retrait.status).toBe(200);
    expect(retrait.body.statut).toBe('annulee');

    const retraitTraitee = await api()
      .delete(`/api/locatif/locataire/resiliations/${demandeId}`)
      .set(auth(jetonLocataire));
    expect(retraitTraitee.status).toBe(400);
  });
});
