/**
 * Remplit toutes les parties du site public avec des contenus de démonstration (environnement local jetable).
 *
 * Les photos viennent du compte public de démonstration de Cloudinary (`demo`) : aucune image n'est envoyée
 * sur le compte de MTM, et rien n'est écrit ailleurs que dans la base fictive de `npm run dev:local`.
 * Les vidéos sont des liens YouTube de films libres (miniatures réelles) : leurs titres sont fictifs.
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

/** Photos du compte de démonstration Cloudinary (identifiants publics). */
const PHOTOS = {
  terrain: ['landscape', 'docs/beach', 'beach'],
  bati: ['docs/house', 'kitchen-island', 'landscape'],
  interieur: ['kitchen-island', 'docs/house', 'beach'],
  vitrine: ['docs/house', 'landscape', 'kitchen-island', 'beach', 'docs/beach'],
};
export const CLOUD_DEMO = 'demo';

const MOT_DU_DIRECTEUR = [
  'Bienvenue chez MTM IMMOBILIER',
  'Chers clients, partenaires et visiteurs,',
  'C’est avec un immense plaisir que je vous souhaite la bienvenue sur le site officiel de MTM IMMOBILIER, une entreprise engagée à vos côtés pour concrétiser vos projets immobiliers en toute confiance.',
  'Convaincus que l’immobilier représente bien plus qu’un simple investissement, nous considérons chaque acquisition comme une étape importante dans la construction d’un avenir stable et durable. C’est pourquoi nous plaçons l’écoute, la transparence, le professionnalisme et la satisfaction de nos clients au cœur de notre démarche.',
  'Notre ambition est de vous accompagner à chaque étape de votre projet, qu’il s’agisse de l’achat d’un terrain, de l’acquisition d’un bien immobilier, de la recherche d’une opportunité d’investissement ou de la réalisation de votre projet de construction.',
  'Au Sénégal, le secteur immobilier offre de nombreuses perspectives. Chez MTM IMMOBILIER, nous nous attachons à identifier des opportunités adaptées aux besoins de notre clientèle, tout en accordant une attention particulière aux informations foncières et aux démarches administratives liées aux biens proposés.',
  'Avec MTM IMMOBILIER, donnons vie à vos projets et construisons ensemble un avenir solide.',
].join('\n');

const REALISATIONS = [
  ['Résidence Les Filaos', 'Saly, Mbour', 'Vingt villas jumelées livrées clés en main, avec titre foncier individuel pour chaque acquéreur.', 0],
  ['Lotissement Diamniadio Nord', 'Diamniadio, Dakar', 'Quatre-vingts parcelles viabilisées (eau, électricité, voirie) vendues en moins de huit mois.', 1],
  ['Villa Almadies', 'Almadies, Dakar', 'Villa F5 avec piscine, construite et livrée pour une famille de la diaspora, suivie à distance de bout en bout.', 2],
  ['Immeuble Sacré-Cœur', 'Sacré-Cœur, Dakar', 'Rénovation complète d’un immeuble de douze appartements, aujourd’hui en gestion locative.', 3],
];
const PROJETS = [
  ['Résidence Les Baobabs', 'Bambilor, Dakar', 'Trente appartements du F2 au F4 près du nouvel axe routier. Réservations ouvertes.', 4],
  ['Cité Teranga', 'Sébikotane, Thiès', 'Parcelles de 150 à 300 m² avec titre foncier, livraison de la viabilisation prévue au printemps.', 1],
  ['Villas du Lac', 'Lac Rose, Dakar', 'Dix villas contemporaines autour d’un espace paysager, programme en cours de commercialisation.', 0],
];

const MEMBRES = [
  ['Awa Ndiaye', 'Responsable commerciale'],
  ['Fatou Diop', 'Conseillère immobilier'],
  ['Moussa Fall', 'Conseiller immobilier'],
  ['Ibrahima Sow', 'Comptable'],
  ['Mariama Sarr', 'Responsable gestion locative'],
  ['Cheikh Diallo', 'Chargé des démarches foncières'],
];

// [titre, catégorie, résumé, identifiant YouTube, jours avant aujourd'hui, à la une]
const VIDEOS = [
  ['Comment vérifier un titre foncier avant d’acheter', 'foncier', 'Les trois documents à demander au vendeur et les erreurs qui coûtent cher.', 'aqz-KE-bpKQ', 2, true],
  ['Acheter un terrain depuis l’étranger : mode d’emploi', 'conseil', 'Procuration, visite à distance, paiement sécurisé : les étapes pour la diaspora.', 'eRsGyueVLvQ', 6, false],
  ['Construire sa villa : les 5 postes du budget', 'construction', 'Où va l’argent d’un chantier et comment éviter les dépassements.', 'R6MlUcmOul8', 11, false],
  ['Le marché immobilier à Dakar en 2026', 'actualite', 'Où les prix montent, où acheter malin, quelles zones à surveiller.', 'TLkA0RELQ1g', 17, false],
  ['Louer son bien en toute sérénité', 'conseil', 'Bail, caution, état des lieux : ce que MTM prend en charge pour vous.', 'YE7VzlLtp-4', 24, false],
  ['Terrain, villa ou appartement : que choisir ?', 'conseil', 'Les critères pour décider selon votre budget et votre projet.', 'aqz-KE-bpKQ', 33, false],
];

// Locations : [titre, type, commune, région, loyer, chambres, pièces, meublé, courte durée (prix/nuit), en avant, photos]
const LOCATIONS = [
  ['Appartement F3 lumineux aux Almadies', 'appartement', 'Almadies', 'Dakar', 450000, 2, 3, true, null, true, 'interieur'],
  ['Villa F4 avec jardin à Mermoz', 'villa', 'Mermoz', 'Dakar', 850000, 3, 4, false, null, true, 'bati'],
  ['Studio meublé près de la corniche', 'appartement', 'Fann', 'Dakar', 220000, 1, 1, true, null, false, 'interieur'],
  ['Appartement F2 neuf à Ouakam', 'appartement', 'Ouakam', 'Dakar', 300000, 1, 2, false, null, false, 'interieur'],
  ['Villa en bord de mer à Saly', 'villa', 'Saly', 'Thiès', 0, 4, 5, true, 95000, true, 'bati'],
  ['Appartement vue océan, séjours courts', 'appartement', 'Mbour', 'Thiès', 0, 2, 3, true, 45000, false, 'interieur'],
];

async function pg(urlBase) {
  const { default: pgLib } = await import(pathToFileURL(require.resolve('pg', { paths: ['C:/Users/user/Desktop/mtm'] })).href);
  const client = new pgLib.Client({ connectionString: urlBase });
  await client.connect();
  return client;
}

async function essayer(libelle, action) {
  try {
    return await action();
  } catch (erreur) {
    console.warn(`  [démo] ${libelle} : ${String(erreur.message).slice(0, 140)}`);
    return null;
  }
}

/** Remplit le site : photos des biens, locations, réalisations, projets, équipe, vidéos, promotion. */
export async function peuplerSite({ api, urlBase, donnees }) {
  const bd = await pg(urlBase);
  const compte = {};
  try {
    // 1. Biens à vendre : trois photos publiques chacun, trois mis en avant pour l'accueil.
    const terrains = await bd.query('SELECT id, "typeBien" FROM terrains ORDER BY "referenceInterne"');
    let n = 0;
    for (const terrain of terrains.rows) {
      const photos = terrain.typeBien === 'terrain' ? PHOTOS.terrain : PHOTOS.bati;
      for (const [rang, cle] of photos.entries()) {
        await bd.query(
          `INSERT INTO terrain_medias (id, "terrainId", type, "storageKey", "resourceType", title, "isPublic", "sortOrder")
           VALUES (gen_random_uuid(), $1, 'photo', $2, 'image', $3, true, $4)`,
          [terrain.id, cle, `Vue ${rang + 1}`, rang],
        );
        n++;
      }
    }
    await bd.query(`UPDATE terrains SET "misEnAvant" = true WHERE id IN (SELECT id FROM terrains ORDER BY "referenceInterne" LIMIT 3)`);
    compte.biens = `${terrains.rowCount} biens, ${n} photos`;

    // 2. Locations (longue et courte durée), publiées, avec photos.
    const proprietaires = donnees.proprietaires.filter(Boolean);
    let louees = 0;
    for (const [i, [titre, type, commune, region, loyer, chambres, pieces, meuble, prixNuit, enAvant, jeu]] of LOCATIONS.entries()) {
      const proprietaire = proprietaires[i % proprietaires.length];
      const courte = prixNuit !== null;
      const bien = await essayer(`location ${titre}`, () =>
        api.post('/locatif/biens', {
          proprietaireId: proprietaire.id,
          type,
          adresse: `${commune}, ${region}`,
          commune,
          region,
          superficie: 40 + chambres * 25,
          titre,
          description: `${titre}. ${meuble ? 'Entièrement meublé et équipé' : 'Non meublé'}, dans un quartier calme et bien desservi, proche des commerces et des transports. Visites sur rendez-vous avec un conseiller MTM.`,
          nombrePieces: pieces,
          nombreChambres: chambres,
          nombreSallesEau: Math.max(1, chambres - 1),
          meuble,
          equipements: ['Climatisation', 'Eau chaude', 'Parking', 'Gardien', ...(courte ? ['Wi-Fi', 'Piscine'] : [])],
          latitude: 14.69 + i * 0.012,
          longitude: -17.47 + i * 0.01,
          ...(courte
            ? { modeLocation: 'courte_duree', prixNuit, fraisMenage: 15000, cautionSejour: 100000, nuitsMinimum: 2, capaciteVoyageurs: chambres * 2, heureArrivee: '15:00', heureDepart: '11:00' }
            : { modeLocation: 'longue_duree', loyerMensuel: loyer, charges: 25000, moisCaution: 2 }),
          publie: true,
          misEnAvant: enAvant,
        }),
      );
      if (!bien) continue;
      for (const [rang, cle] of PHOTOS[jeu].entries()) {
        await bd.query(
          `INSERT INTO biens_locatifs_medias (id, "bienLocatifId", type, "storageKey", "resourceType", title, "sortOrder")
           VALUES (gen_random_uuid(), $1, 'photo', $2, 'image', $3, $4)`,
          [bien.id, cle, `Photo ${rang + 1}`, rang],
        );
      }
      // Un bien n'est jamais publié à la création : la publication exige un loyer et au moins une photo. On publie
      // donc une fois les photos posées, comme le ferait le back-office.
      if (await essayer(`publication ${titre}`, () => api.patch(`/locatif/biens/${bien.id}`, { publie: true, misEnAvant: enAvant }))) louees++;
    }
    compte.locations = `${louees} annonces`;

    // 3. Réalisations et projets à venir.
    let vitrine = 0;
    for (const [categorie, liste] of [['realisation', REALISATIONS], ['projet_a_venir', PROJETS]]) {
      for (const [ordre, [titre, lieu, description, photo]] of liste.entries()) {
        const item = await essayer(`vitrine ${titre}`, () =>
          api.post('/showcase', {
            category: categorie,
            title: titre,
            description,
            location: lieu,
            date: categorie === 'realisation' ? `202${5 - (ordre % 2)}-0${3 + ordre}-15` : `2027-0${2 + ordre}-01`,
            ordre,
            isActive: true,
          }),
        );
        if (!item) continue;
        await bd.query('UPDATE showcase_items SET "storageKey" = $1 WHERE id = $2', [PHOTOS.vitrine[photo % PHOTOS.vitrine.length], item.id]);
        vitrine++;
      }
    }
    compte.vitrine = `${vitrine} réalisations et projets`;

    // 4. Équipe : mot du directeur, photo de groupe, collaborateurs (sans photo : le site affiche leurs initiales).
    let equipe = 0;
    // Le directeur et la photo de groupe existent déjà (fiches vides, non publiées) : on les complète.
    const existants = (await essayer('équipe', () => api.get('/team/admin'))) ?? [];
    const liste = Array.isArray(existants) ? existants : (existants.items ?? []);
    const directeur = liste.find((m) => m.kind === 'directeur');
    if (directeur && (await essayer('directeur', () => api.patch(`/team/${directeur.id}`, { nom: 'Momar Talla Mbaye', poste: 'Fondateur et Directeur Général', message: MOT_DU_DIRECTEUR })))) {
      await essayer('publier le directeur', () => api.patch(`/team/${directeur.id}/publish`, { isActive: true }));
      equipe++;
    }
    const groupe = liste.find((m) => m.kind === 'groupe');
    if (groupe && (await essayer('photo de groupe', () => api.patch(`/team/${groupe.id}`, { nom: 'L’équipe MTM Immobilier' })))) {
      await bd.query('UPDATE team_members SET "storageKey" = $1 WHERE id = $2', ['cld-sample-3', groupe.id]);
      await essayer('publier le groupe', () => api.patch(`/team/${groupe.id}/publish`, { isActive: true }));
      equipe++;
    }
    for (const [ordre, [nom, poste]] of MEMBRES.entries()) {
      if (await essayer(`membre ${nom}`, () => api.post('/team', { kind: 'membre', nom, poste, ordre, isActive: true }))) equipe++;
    }
    compte.equipe = `${equipe} fiches`;

    // 5. Actualités et conseils : vidéos YouTube publiées.
    let videos = 0;
    for (const [titre, categorie, resume, youtube, jours, enAvant] of VIDEOS) {
      const date = new Date(Date.now() - jours * 86_400_000).toISOString();
      const publication = await essayer(`vidéo ${titre}`, () =>
        api.post('/publications', { titre, categorie, resume, datePublication: date, youtubeUrl: `https://www.youtube.com/watch?v=${youtube}`, misEnAvant: enAvant }),
      );
      if (!publication) continue;
      await essayer(`publication ${titre}`, () => api.patch(`/publications/${publication.id}/publish`, { isActive: true }));
      videos++;
    }
    compte.videos = `${videos} vidéos`;

    // 6. Publicité du bandeau d'accueil (remplace la vidéo d'accueil tant qu'elle est en ligne).
    const promotion = await essayer('promotion', () =>
      api.post('/promotions', {
        titre: 'Offre de rentrée',
        description: 'Frais de dossier offerts sur tout achat de terrain réservé avant la fin du mois',
        lienUrl: '/terrains',
        libelleLien: 'Voir les terrains',
        dateDebut: new Date(Date.now() - 2 * 86_400_000).toISOString(),
        dateFin: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        ordre: 0,
        isActive: true,
      }),
    );
    if (promotion) await bd.query('UPDATE promotions SET "storageKey" = $1 WHERE id = $2', ['landscape', promotion.id]);
    compte.promotion = promotion ? '1 publicité' : 'aucune';

    // 7. Bandeaux des pages Réalisations et Projets à venir.
    for (const [cle, photo] of [['realisations.image', 'docs/house'], ['projets-a-venir.image', 'landscape']]) {
      await bd.query(
        `INSERT INTO content_blocks (id, key, title, content, type, ordre, "isActive", "updatedAt")
         VALUES (gen_random_uuid(), $1, 'Image du bandeau', $2, 'text', 0, true, now())
         ON CONFLICT (key) DO UPDATE SET content = EXCLUDED.content, "isActive" = true`,
        [cle, `https://res.cloudinary.com/${CLOUD_DEMO}/image/upload/f_auto,q_auto/${photo}`],
      );
    }
    compte.bandeaux = '2 bandeaux';
  } finally {
    await bd.end();
  }
  return compte;
}
