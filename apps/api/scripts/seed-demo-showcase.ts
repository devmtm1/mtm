import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

/**
 * Éléments de vitrine de démonstration (réalisations et projets à venir),
 * complémentaires à ceux saisis en back-office. Chaque élément est identifié
 * par son couple (catégorie, titre) : relancer le script n'insère que les
 * manquants et ne modifie jamais un élément existant.
 *
 * Localisations réelles, programmes plausibles mais fictifs. Les visuels
 * restent à ajouter depuis le back-office (module Vitrine).
 *
 * Refuse de s'exécuter en production.
 *
 * Usage : npm run demo:showcase
 */

const prisma = new PrismaClient();

type ShowcaseCategory = 'realisation' | 'projet_a_venir';

interface DemoShowcaseItem {
  title: string;
  description: string;
  location: string;
  /** Date de livraison (réalisée ou prévue), AAAA-MM-JJ. */
  date: string;
  ordre: number;
}

const DEMO_REALISATIONS: DemoShowcaseItem[] = [
  {
    title: 'Villa Kër Yaay',
    description:
      'Villa R+1 de 5 chambres avec piscine et dépendance, construite pour un client résidant en France. Suivi de chantier hebdomadaire par photos et visioconférence, livrée dans les délais.',
    location: 'Saly Portudal, Thiès',
    date: '2025-07-15',
    ordre: 2,
  },
  {
    title: 'Résidence Diaspora Ngor',
    description:
      'Immeuble R+4 de 16 appartements avec ascenseur et parking, vendu sur plan à 100 % avant livraison. Gestion locative assurée par MTM pour 11 propriétaires.',
    location: 'Ngor, Dakar',
    date: '2025-03-28',
    ordre: 3,
  },
  {
    title: 'Lotissement Les Palmiers',
    description:
      '40 parcelles viabilisées (voirie, eau, électricité) avec titres fonciers individuels délivrés à chaque acquéreur. Régularisation foncière menée de bout en bout.',
    location: 'Bambilor, Dakar',
    date: '2024-12-10',
    ordre: 4,
  },
  {
    title: 'Vérification foncière — 120 dossiers',
    description:
      'Campagne de vérification physique et administrative de 120 terrains pour des acquéreurs de la diaspora : 31 dossiers déconseillés, 89 sécurisés avant achat.',
    location: 'Régions de Dakar et Thiès',
    date: '2025-01-31',
    ordre: 5,
  },
  {
    title: 'Maison d’hôtes La Somone',
    description:
      'Réhabilitation complète et extension d’une maison d’hôtes de 8 chambres au bord de la lagune, avec mise aux normes et aménagement paysager.',
    location: 'Somone, Thiès',
    date: '2024-10-05',
    ordre: 6,
  },
  {
    title: 'Duplex jumelés Keur Massar',
    description:
      'Programme de 6 duplex F4 jumelés en résidence fermée, livrés clés en main avec cuisine équipée. Premier programme MTM entièrement financé par des acquéreurs de l’étranger.',
    location: 'Keur Massar, Dakar',
    date: '2024-06-20',
    ordre: 7,
  },
  {
    title: 'Immeuble de bureaux Thiès Centre',
    description:
      'Bâtiment R+2 de 600 m² de bureaux modulables loué à une banque et deux cabinets, gestion locative et maintenance confiées à MTM.',
    location: 'Thiès',
    date: '2025-05-12',
    ordre: 8,
  },
  {
    title: 'Ferme maraîchère de Pout',
    description:
      'Aménagement de 2 hectares : forage, irrigation goutte-à-goutte, clôture et bâtiment de stockage, pour un investisseur basé au Canada. Exploitation en activité.',
    location: 'Pout, Thiès',
    date: '2024-03-18',
    ordre: 9,
  },
];

const DEMO_PROJECTS: DemoShowcaseItem[] = [
  {
    title: 'Résidence Les Filaos',
    description:
      '24 appartements F3 et F4 sur 4 niveaux avec ascenseur, parking en sous-sol et espace vert central. Livraison clé en main, gestion locative proposée.',
    location: 'Diamniadio, Dakar',
    date: '2027-06-30',
    ordre: 1,
  },
  {
    title: 'Lotissement Teranga Village',
    description:
      '60 parcelles de 200 à 400 m² entièrement viabilisées (voirie, eau, électricité, éclairage public), avec titres fonciers individuels.',
    location: 'Bambilor, Dakar',
    date: '2026-12-15',
    ordre: 2,
  },
  {
    title: 'Villas Océane',
    description:
      '12 villas de 3 à 4 chambres avec piscine privée dans une résidence sécurisée à 300 m de la plage. Programme pensé pour la diaspora avec suivi de chantier à distance.',
    location: 'Somone, Thiès',
    date: '2027-03-31',
    ordre: 3,
  },
  {
    title: 'Centre commercial Saly Plaza',
    description:
      'Immeuble mixte R+3 : 18 cellules commerciales en rez-de-chaussée, bureaux et 16 appartements aux étages, face à la zone hôtelière.',
    location: 'Saly Portudal, Thiès',
    date: '2027-09-30',
    ordre: 4,
  },
  {
    title: 'Résidence étudiante Ngallèle',
    description:
      '80 studios meublés à proximité de l’Université Gaston Berger, avec salle d’étude, buanderie et gardiennage 24h/24. Rendement locatif garanti la première année.',
    location: 'Saint-Louis',
    date: '2027-01-31',
    ordre: 5,
  },
  {
    title: 'Éco-lodge Casamance',
    description:
      '10 bungalows en matériaux locaux au bord du fleuve, restaurant et ponton. Projet d’investissement touristique ouvert en copropriété.',
    location: 'Cap Skirring, Ziguinchor',
    date: '2027-11-30',
    ordre: 6,
  },
  {
    title: 'Domaine agricole des Niayes',
    description:
      '5 hectares de parcelles maraîchères avec forage, système d’irrigation goutte-à-goutte et magasin de stockage partagé. Accompagnement technique inclus.',
    location: 'Sébikotane, Dakar',
    date: '2026-11-30',
    ordre: 7,
  },
  {
    title: 'Résidence Baobab',
    description:
      '36 appartements du F2 au F5 avec vue sur la lagune, à 15 minutes de l’aéroport AIBD. Livraison en deux tranches, réservation ouverte sur plan.',
    location: 'Mbour, Thiès',
    date: '2028-03-31',
    ordre: 8,
  },
];

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refus : données de démonstration, non destinées à la production.');
    process.exitCode = 1;
    return;
  }

  // Les éléments existants ont un créateur : on réutilise le premier
  // administrateur trouvé pour que l'audit reste cohérent.
  const author = await prisma.user.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  const batches: { category: ShowcaseCategory; label: string; items: DemoShowcaseItem[] }[] = [
    { category: 'realisation', label: 'Réalisations', items: DEMO_REALISATIONS },
    { category: 'projet_a_venir', label: 'Projets à venir', items: DEMO_PROJECTS },
  ];

  for (const { category, label, items } of batches) {
    let created = 0;
    let skipped = 0;
    console.log(`${label} :`);

    for (const item of items) {
      const existing = await prisma.showcaseItem.findFirst({
        where: { category, title: item.title },
        select: { id: true },
      });
      if (existing) {
        skipped += 1;
        continue;
      }

      await prisma.showcaseItem.create({
        data: {
          category,
          title: item.title,
          description: item.description,
          location: item.location,
          date: new Date(item.date),
          ordre: item.ordre,
          isActive: true,
          createdById: author?.id,
        },
      });
      created += 1;
      console.log(`  + ${item.title}  (${item.location})`);
    }

    console.log(`  → ${created} créé(s), ${skipped} déjà présent(s).`);
  }
}

main()
  .catch((error) => {
    console.error('Échec de la création des projets de démonstration :', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
