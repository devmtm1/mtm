import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

/**
 * Jeu de terrains de démonstration (T-3 à T-12), complémentaire aux terrains
 * saisis en back-office. Chaque terrain est inséré par `upsert` sur sa
 * référence interne : relancer le script est sans effet sur ceux déjà
 * présents (aucune donnée saisie à la main n'est écrasée).
 *
 * Les localisations sont réelles (communes et coordonnées GPS du Sénégal),
 * les prix et surfaces sont plausibles mais fictifs. Les terrains sont
 * publiés (`Disponible`) pour alimenter le site public ; les photos restent
 * à ajouter depuis le back-office.
 *
 * Refuse de s'exécuter en production.
 *
 * Usage : npm run demo:terrains
 */

const prisma = new PrismaClient();

interface DemoTerrain {
  referenceInterne: string;
  nom: string;
  statutJuridique: string;
  typeDocumentFoncier: string;
  niveauVerification: string;
  region: string;
  commune: string;
  localisationDetail: string;
  latitude: number;
  longitude: number;
  superficie: number;
  dimensions: { description: string };
  prixAcquisition: number;
  prixPublic: number;
  commission: number;
  vocation: string;
  accesRoutier: string;
  eauDisponible: boolean;
  electriciteDisponible: boolean;
  voisinage: string;
  proximiteAxes: string;
  pointsInteret: { nom: string; type: string; distanceKm: number }[];
  misEnAvant: boolean;
  description: string;
}

const DEMO_TERRAINS: DemoTerrain[] = [
  {
    referenceInterne: 'T-3',
    nom: 'Parcelle résidentielle Diamniadio',
    statutJuridique: 'Titre foncier',
    typeDocumentFoncier: 'foncier',
    niveauVerification: 'Vérifié',
    region: 'Dakar',
    commune: 'Diamniadio',
    localisationDetail: 'Cité Senegindia, à 5 min du pôle urbain',
    latitude: 14.7245,
    longitude: -17.1823,
    superficie: 300,
    dimensions: { description: '20;15' },
    prixAcquisition: 9500000,
    prixPublic: 12500000,
    commission: 500000,
    vocation: 'habitation',
    accesRoutier: 'Voie bitumée, sortie autoroute à péage',
    eauDisponible: true,
    electriciteDisponible: true,
    voisinage: 'Quartier résidentiel récent, plusieurs villas achevées',
    proximiteAxes: 'Autoroute Dakar–AIBD à 3 km',
    pointsInteret: [
      { nom: 'Gare TER Diamniadio', type: 'transport', distanceKm: 2.5 },
      { nom: 'Université Amadou Mahtar Mbow', type: 'universite', distanceKm: 4 },
    ],
    misEnAvant: true,
    description:
      "Parcelle de 300 m² avec titre foncier individuel, dans un secteur en pleine structuration à proximité immédiate du nouveau pôle urbain.\n\nRaccordements eau et électricité disponibles en bordure. Un choix sûr pour une résidence principale ou un investissement locatif.",
  },
  {
    referenceInterne: 'T-4',
    nom: 'Terrain en bord de mer – Toubab Dialaw',
    statutJuridique: 'Bail',
    typeDocumentFoncier: 'bail',
    niveauVerification: 'Vérifié',
    region: 'Thies',
    commune: 'Yenne',
    localisationDetail: 'Toubab Dialaw, à 400 m de la plage',
    latitude: 14.6052,
    longitude: -17.1548,
    superficie: 600,
    dimensions: { description: '30;20' },
    prixAcquisition: 18000000,
    prixPublic: 24000000,
    commission: 1000000,
    vocation: 'touristique',
    accesRoutier: 'Piste latéritique praticable toute l’année',
    eauDisponible: true,
    electriciteDisponible: true,
    voisinage: 'Auberges, résidences secondaires, village d’artistes',
    proximiteAxes: 'Route nationale 1 à 6 km',
    pointsInteret: [
      { nom: 'Plage de Toubab Dialaw', type: 'plage', distanceKm: 0.4 },
      { nom: 'Espace Sobo Badé', type: 'culture', distanceKm: 0.8 },
    ],
    misEnAvant: true,
    description:
      "À quelques pas de la plage, ce terrain de 600 m² se prête à un projet de maison d’hôtes ou de résidence secondaire.\n\nBail en cours de validité, environnement calme et prisé de la diaspora.",
  },
  {
    referenceInterne: 'T-5',
    nom: 'Lot commercial Saly Portudal',
    statutJuridique: 'Titre foncier',
    typeDocumentFoncier: 'foncier',
    niveauVerification: 'Vérifié',
    region: 'Thies',
    commune: 'Saly Portudal',
    localisationDetail: 'Route de Saly, face à la zone hôtelière',
    latitude: 14.4463,
    longitude: -17.0032,
    superficie: 450,
    dimensions: { description: '30;15' },
    prixAcquisition: 26000000,
    prixPublic: 32000000,
    commission: 1200000,
    vocation: 'commercial',
    accesRoutier: 'Façade sur route goudronnée, fort passage',
    eauDisponible: true,
    electriciteDisponible: true,
    voisinage: 'Commerces, restaurants, agences immobilières',
    proximiteAxes: 'Rond-point de Saly à 1 km',
    pointsInteret: [
      { nom: 'Station-service', type: 'service', distanceKm: 0.3 },
      { nom: 'Clinique de Saly', type: 'sante', distanceKm: 1.2 },
    ],
    misEnAvant: false,
    description:
      "Emplacement commercial de premier ordre sur l’axe principal de Saly, idéal pour un immeuble mixte commerces + appartements ou une enseigne de services.",
  },
  {
    referenceInterne: 'T-6',
    nom: 'Parcelle Bambilor – Lac Rose',
    statutJuridique: 'Délibération',
    typeDocumentFoncier: 'deliberation',
    niveauVerification: 'Vérifié',
    region: 'Dakar',
    commune: 'Bambilor',
    localisationDetail: 'Lotissement communal, secteur Niaga',
    latitude: 14.8215,
    longitude: -17.2258,
    superficie: 200,
    dimensions: { description: '20;10' },
    prixAcquisition: 4200000,
    prixPublic: 6000000,
    commission: 300000,
    vocation: 'habitation',
    accesRoutier: 'Piste sablonneuse, accessible en véhicule',
    eauDisponible: false,
    electriciteDisponible: true,
    voisinage: 'Zone en cours de construction, quelques maisons habitées',
    proximiteAxes: 'Route du Lac Rose à 2 km',
    pointsInteret: [
      { nom: 'Lac Rose', type: 'tourisme', distanceKm: 4 },
      { nom: 'Marché de Bambilor', type: 'commerce', distanceKm: 3 },
    ],
    misEnAvant: false,
    description:
      "Petit budget pour un premier achat : parcelle de 200 m² issue d’une délibération communale, dans une zone d’extension de la banlieue dakaroise.\n\nÉlectricité au voisinage, adduction d’eau programmée.",
  },
  {
    referenceInterne: 'T-7',
    nom: 'Grand terrain agricole – Sébikotane',
    statutJuridique: 'Titre foncier',
    typeDocumentFoncier: 'foncier',
    niveauVerification: 'Vérifié',
    region: 'Dakar',
    commune: 'Sébikotane',
    localisationDetail: 'Zone des Niayes, route de Kayar',
    latitude: 14.7468,
    longitude: -17.1301,
    superficie: 5000,
    dimensions: { description: '100;50' },
    prixAcquisition: 22000000,
    prixPublic: 30000000,
    commission: 1000000,
    vocation: 'agricole',
    accesRoutier: 'Piste agricole, 4x4 recommandé en hivernage',
    eauDisponible: true,
    electriciteDisponible: false,
    voisinage: 'Exploitations maraîchères et vergers',
    proximiteAxes: 'Route nationale 2 à 5 km',
    pointsInteret: [{ nom: 'Forage communautaire', type: 'eau', distanceKm: 0.5 }],
    misEnAvant: false,
    description:
      "Un demi-hectare avec titre foncier dans la zone maraîchère des Niayes : sol adapté aux cultures maraîchères et fruitières, nappe peu profonde.\n\nConvient à un projet agricole ou agro-touristique.",
  },
  {
    referenceInterne: 'T-8',
    nom: 'Terrain viabilisé Somone',
    statutJuridique: 'Bail',
    typeDocumentFoncier: 'bail',
    niveauVerification: 'Vérifié',
    region: 'Thies',
    commune: 'Somone',
    localisationDetail: 'À 800 m de la lagune',
    latitude: 14.4931,
    longitude: -17.0629,
    superficie: 400,
    dimensions: { description: '20;20' },
    prixAcquisition: 11000000,
    prixPublic: 15000000,
    commission: 600000,
    vocation: 'habitation',
    accesRoutier: 'Rue pavée, éclairage public',
    eauDisponible: true,
    electriciteDisponible: true,
    voisinage: 'Résidences fermées et villas',
    proximiteAxes: 'Route de Ngaparou à 1 km',
    pointsInteret: [
      { nom: 'Réserve naturelle de la Somone', type: 'nature', distanceKm: 0.8 },
      { nom: 'École privée bilingue', type: 'ecole', distanceKm: 1.5 },
    ],
    misEnAvant: true,
    description:
      "Terrain carré de 400 m², entièrement viabilisé, dans l’une des stations balnéaires les plus recherchées de la Petite Côte.\n\nRue pavée et éclairée, voisinage résidentiel de qualité.",
  },
  {
    referenceInterne: 'T-9',
    nom: 'Parcelle Thiès Nord – Cité Lamy',
    statutJuridique: 'Morcellement',
    typeDocumentFoncier: 'morcellement',
    niveauVerification: 'En cours',
    region: 'Thies',
    commune: 'Thiès Nord',
    localisationDetail: 'Extension Cité Lamy',
    latitude: 14.8033,
    longitude: -16.9312,
    superficie: 250,
    dimensions: { description: '25;10' },
    prixAcquisition: 5500000,
    prixPublic: 7500000,
    commission: 350000,
    vocation: 'habitation',
    accesRoutier: 'Voie en latérite, bitumage programmé',
    eauDisponible: true,
    electriciteDisponible: true,
    voisinage: 'Quartier familial, écoles et commerces de proximité',
    proximiteAxes: 'Route nationale 2 à 2 km',
    pointsInteret: [
      { nom: 'Gare de Thiès', type: 'transport', distanceKm: 3 },
      { nom: 'Hôpital régional', type: 'sante', distanceKm: 2.5 },
    ],
    misEnAvant: false,
    description:
      "Parcelle issue d’un morcellement en cours de finalisation, dans un quartier établi de Thiès. Vérification administrative en cours — les pièces seront jointes au dossier dès réception.",
  },
  {
    referenceInterne: 'T-10',
    nom: 'Terrain mixte Ngallèle – Saint-Louis',
    statutJuridique: 'Titre foncier',
    typeDocumentFoncier: 'foncier',
    niveauVerification: 'Vérifié',
    region: 'Saint-Louis',
    commune: 'Saint-Louis',
    localisationDetail: 'Ngallèle, près du campus universitaire',
    latitude: 16.0392,
    longitude: -16.4318,
    superficie: 800,
    dimensions: { description: '40;20' },
    prixAcquisition: 14000000,
    prixPublic: 19000000,
    commission: 800000,
    vocation: 'mixte',
    accesRoutier: 'Route bitumée de l’université',
    eauDisponible: true,
    electriciteDisponible: true,
    voisinage: 'Résidences étudiantes, commerces',
    proximiteAxes: 'Route nationale 2 à 1 km',
    pointsInteret: [
      { nom: 'Université Gaston Berger', type: 'universite', distanceKm: 1.5 },
      { nom: 'Aéroport de Saint-Louis', type: 'transport', distanceKm: 6 },
    ],
    misEnAvant: false,
    description:
      "800 m² à vocation mixte à deux pas de l’Université Gaston Berger : forte demande locative étudiante, possibilité de rez-de-chaussée commercial.",
  },
  {
    referenceInterne: 'T-11',
    nom: 'Parcelle Kandé – Ziguinchor',
    statutJuridique: 'Régularisation en cours',
    typeDocumentFoncier: 'deliberation',
    niveauVerification: 'En cours',
    region: 'Ziguinchor',
    commune: 'Ziguinchor',
    localisationDetail: 'Quartier Kandé, route de l’aéroport',
    latitude: 12.5641,
    longitude: -16.2705,
    superficie: 350,
    dimensions: { description: '25;14' },
    prixAcquisition: 3800000,
    prixPublic: 5500000,
    commission: 250000,
    vocation: 'habitation',
    accesRoutier: 'Piste carrossable',
    eauDisponible: true,
    electriciteDisponible: true,
    voisinage: 'Quartier calme et verdoyant',
    proximiteAxes: 'Route de l’aéroport à 500 m',
    pointsInteret: [
      { nom: 'Aéroport de Ziguinchor', type: 'transport', distanceKm: 3 },
      { nom: 'Marché Saint-Maur', type: 'commerce', distanceKm: 4 },
    ],
    misEnAvant: false,
    description:
      "Parcelle arborée en Casamance, dans un quartier résidentiel calme. Régularisation foncière en cours, accompagnée par MTM — prix attractif en contrepartie.",
  },
  {
    referenceInterne: 'T-12',
    nom: 'Terrain vue mer – Popenguine',
    statutJuridique: 'Titre foncier',
    typeDocumentFoncier: 'foncier',
    niveauVerification: 'Vérifié',
    region: 'Thies',
    commune: 'Popenguine',
    localisationDetail: 'Sur les hauteurs, vue dégagée sur l’océan',
    latitude: 14.5527,
    longitude: -17.1189,
    superficie: 1000,
    dimensions: { description: '40;25' },
    prixAcquisition: 32000000,
    prixPublic: 42000000,
    commission: 1500000,
    vocation: 'touristique',
    accesRoutier: 'Route goudronnée jusqu’à 200 m, puis piste',
    eauDisponible: true,
    electriciteDisponible: true,
    voisinage: 'Résidences de standing, réserve naturelle',
    proximiteAxes: 'Route nationale 1 à 4 km',
    pointsInteret: [
      { nom: 'Réserve naturelle de Popenguine', type: 'nature', distanceKm: 1 },
      { nom: 'Plage de Popenguine', type: 'plage', distanceKm: 1.2 },
    ],
    misEnAvant: true,
    description:
      "Terrain d’exception de 1 000 m² avec vue panoramique sur l’Atlantique, à Popenguine.\n\nTitre foncier, viabilisé, idéal pour une villa de prestige ou un projet d’hébergement touristique haut de gamme.",
  },
];

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refus : données de démonstration, non destinées à la production.');
    process.exitCode = 1;
    return;
  }

  // Les terrains existants sont rattachés à un propriétaire : on réutilise
  // le premier trouvé pour rester cohérent, sans en créer un fictif.
  const proprietaire = await prisma.proprietaire.findFirst({ select: { id: true } });

  let created = 0;
  let skipped = 0;
  for (const terrain of DEMO_TERRAINS) {
    const existing = await prisma.terrain.findUnique({
      where: { referenceInterne: terrain.referenceInterne },
      select: { id: true },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.terrain.create({
      data: {
        ...terrain,
        uniteSuperficie: 'm²',
        statutCommercial: 'Disponible',
        marge: terrain.prixPublic - terrain.prixAcquisition,
        proprietaireId: proprietaire?.id,
      },
    });
    created += 1;
    console.log(`  + ${terrain.referenceInterne}  ${terrain.nom}`);
  }

  console.log(`Terrains de démonstration : ${created} créé(s), ${skipped} déjà présent(s).`);
}

main()
  .catch((error) => {
    console.error('Échec de la création des terrains de démonstration :', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
