import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import {
  attributionLabel,
  configureCloudinaryFromEnv,
  fetchCommonsPhoto,
  uploadPublicImage,
  type CommonsPhoto,
} from './lib/commons-photos';

/**
 * Visuels de démonstration pour les éléments de vitrine créés par
 * `demo:showcase` (projets à venir, réalisations).
 *
 * Images Wikimedia Commons sous licence libre, choisies pour évoquer le type
 * de programme et, autant que possible, le lieu. Comme pour les terrains, ce
 * sont des illustrations de démonstration : MTM les remplacera par ses
 * propres visuels (perspectives, photos de chantier) depuis le back-office.
 *
 * Le modèle de vitrine n'a pas de champ dédié au crédit photo : l'attribution
 * est consignée ici, dans le code, et affichée dans le journal d'exécution.
 *
 * Idempotent : un élément qui possède déjà une image n'est pas touché.
 * Refuse de s'exécuter en production.
 *
 * Usage : npm run demo:showcase-photos
 */

const prisma = new PrismaClient();

const SHOWCASE_FOLDER = 'mtm/showcase';

interface DemoShowcasePhoto extends CommonsPhoto {
  category: 'realisation' | 'projet_a_venir';
  /** Titre exact de l'élément de vitrine, tel que créé par demo:showcase. */
  title: string;
}

const PHOTOS: DemoShowcasePhoto[] = [
  // — Réalisations —
  {
    category: 'realisation',
    title: 'Villa Kër Yaay',
    file: 'Villa Thièsoise.jpg',
    license: 'CC BY-SA 4.0',
    artist: 'Bigfall91',
  },
  {
    category: 'realisation',
    title: 'Résidence Diaspora Ngor',
    file: 'Dakar - Immeuble.JPG',
    license: 'CC BY-SA 3.0',
    artist: 'HaguardDuNord',
  },
  {
    category: 'realisation',
    title: 'Lotissement Les Palmiers',
    file: 'Cité APIX Tivaouane peulh-niague 06.jpg',
    license: 'CC BY 4.0',
    artist: '4MAPS',
  },
  {
    category: 'realisation',
    title: 'Vérification foncière — 120 dossiers',
    file: 'Dakar-Aerial1.jpg',
    license: 'Domaine public',
    artist: 'Ji-Elle',
  },
  {
    category: 'realisation',
    title: 'Maison d’hôtes La Somone',
    file: 'De la lagune de somone.jpg',
    license: 'CC BY-SA 4.0',
    artist: 'Yagamar',
  },
  {
    category: 'realisation',
    title: 'Duplex jumelés Keur Massar',
    file: 'Villa dans un village à thiès.jpg',
    license: 'CC BY-SA 4.0',
    artist: 'Deyonro23',
  },
  {
    category: 'realisation',
    title: 'Immeuble de bureaux Thiès Centre',
    file: 'Musée régional de Thiès - Bâtiment du chemin de fer.jpg',
    license: 'CC0',
    artist: 'Zythème',
  },
  {
    category: 'realisation',
    title: 'Ferme maraîchère de Pout',
    file: 'Katakel-Oignons et papayers.jpg',
    license: 'CC BY 2.0',
    artist: 'Trees ForTheFuture',
  },
  // — Projets à venir —
  {
    category: 'projet_a_venir',
    title: 'Résidence Les Filaos',
    file: 'Dakar - Immeuble luxueux (2).JPG',
    license: 'CC BY-SA 3.0',
    artist: 'HaguardDuNord',
  },
  {
    category: 'projet_a_venir',
    title: 'Lotissement Teranga Village',
    file: 'Lac Rose in Senegal.jpg',
    license: 'CC BY-SA 2.0',
    artist: 'Arnault',
  },
  {
    category: 'projet_a_venir',
    title: 'Villas Océane',
    file: '20230901 193127756 La Maison de Clara.jpg',
    license: 'CC BY-SA 4.0',
    artist: 'Tbo47',
  },
  {
    category: 'projet_a_venir',
    title: 'Centre commercial Saly Plaza',
    file: '@raymondiop-la-ville-de-dakar-4.jpg',
    license: 'CC BY-SA 4.0',
    artist: 'Raymond Diop',
  },
  {
    category: 'projet_a_venir',
    title: 'Résidence étudiante Ngallèle',
    file: 'UGBVillageL.jpg',
    license: 'Domaine public',
    artist: 'Maissambaye',
  },
  {
    category: 'projet_a_venir',
    title: 'Éco-lodge Casamance',
    file: 'Bolong cap skirring.jpg',
    license: 'CC BY 3.0',
    artist: 'Olivierkeita',
  },
  {
    category: 'projet_a_venir',
    title: 'Domaine agricole des Niayes',
    file: 'Champs de Ibrahima Thiam 01.jpg',
    license: 'CC0',
    artist: 'Lifelame44',
  },
  {
    category: 'projet_a_venir',
    title: 'Résidence Baobab',
    file: 'La Lagune de la Somone 05.jpg',
    license: 'CC BY 2.0',
    artist: 'Andersonphotography',
  },
];

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refus : données de démonstration, non destinées à la production.');
    process.exitCode = 1;
    return;
  }
  if (!configureCloudinaryFromEnv()) {
    console.error('Cloudinary non configuré : impossible de stocker les photos.');
    process.exitCode = 1;
    return;
  }

  let uploaded = 0;
  for (const photo of PHOTOS) {
    const item = await prisma.showcaseItem.findFirst({
      where: { category: photo.category, title: photo.title },
      select: { id: true, storageKey: true },
    });
    if (!item) {
      console.log(`  « ${photo.title} » absent — lancer d'abord demo:showcase.`);
      continue;
    }
    if (item.storageKey) {
      console.log(`  « ${photo.title} » possède déjà une image — ignoré.`);
      continue;
    }

    const buffer = await fetchCommonsPhoto(photo.file);
    const result = await uploadPublicImage(buffer, SHOWCASE_FOLDER);
    await prisma.showcaseItem.update({
      where: { id: item.id },
      data: { storageKey: result.public_id, resourceType: result.resource_type },
    });
    uploaded += 1;
    console.log(`  + ${photo.title}  ←  ${photo.file}  (${attributionLabel(photo)})`);
  }

  console.log(`Visuels de vitrine : ${uploaded} envoyé(s).`);
}

main()
  .catch((error) => {
    console.error('Échec de l’ajout des visuels de vitrine :', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
