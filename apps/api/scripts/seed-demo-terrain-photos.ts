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
 * Photos de démonstration pour les terrains T-3 à T-12.
 *
 * Les images proviennent de Wikimedia Commons, sous licence libre (CC0,
 * domaine public, CC BY ou CC BY-SA) et ont été choisies pour leur lieu :
 * ce sont des vues réelles des communes concernées, pas des photos des
 * parcelles elles-mêmes. Elles servent uniquement à donner corps au site en
 * démonstration — en production, MTM doit les remplacer par ses propres
 * prises de vue (section 7 du cahier des charges).
 *
 * L'attribution (auteur, licence) est conservée dans le titre du média,
 * comme l'exigent les licences CC BY / CC BY-SA.
 *
 * Idempotent : un terrain qui possède déjà au moins un média n'est pas
 * touché. Refuse de s'exécuter en production.
 *
 * Usage : npm run demo:terrain-photos
 */

const prisma = new PrismaClient();

const PHOTOS_BY_TERRAIN: Record<string, CommonsPhoto[]> = {
  'T-3': [
    { file: 'Gare du TER de Diamniadio 03.jpg', license: 'CC BY-SA 4.0', artist: 'Ourytima' },
    { file: 'Dakar Arena, Senegal.jpg', license: 'CC BY-SA 4.0', artist: 'Isabelle Lemelin' },
  ],
  'T-4': [
    { file: 'Toubab Dialaw general view.jpg', license: 'CC BY-SA 4.0', artist: 'Anthere' },
    { file: 'Toubab Dialaw 294A2254 Senegal.jpg', license: 'CC BY-SA 4.0', artist: 'Christian Pirkl' },
    { file: 'Toubab Dialaw 1.jpg', license: 'CC BY-SA 4.0', artist: 'Anthere' },
  ],
  'T-5': [
    { file: 'SalyPortudalBeach.jpg', license: 'CC BY-SA 4.0', artist: 'Jjm2311' },
    { file: 'Saly Senegal1.JPG', license: 'CC BY-SA 2.5', artist: 'Jean-Claude Perez' },
    { file: 'Plage de Saly (Sénégal).jpg', license: 'CC BY-SA 4.0', artist: 'Davric' },
  ],
  'T-6': [
    { file: 'Lac Rose Sénégal 17.jpg', license: 'CC BY-SA 4.0', artist: 'Issiaga0' },
    { file: 'RetbaLakeShore.jpg', license: 'CC BY-SA 4.0', artist: 'Jjm2311' },
    { file: 'Lac Rose Sénégal 10.jpg', license: 'CC BY-SA 4.0', artist: 'Issiaga0' },
  ],
  'T-7': [
    { file: 'Champs de Ibrahima Thiam 02.jpg', license: 'CC0', artist: 'Lifelame44' },
    { file: 'Dar Salam-Plantation de haie vive.jpg', license: 'CC BY 2.0', artist: 'Trees ForTheFuture' },
  ],
  'T-8': [
    { file: 'La Lagune de la Somone 03.jpg', license: 'CC BY 2.0', artist: 'Andersonphotography' },
    { file: 'La Lagune de la Somone 04.jpg', license: 'CC BY 2.0', artist: 'Andersonphotography' },
    { file: 'Ostréiculteur de la lagune de Somone 1.jpg', license: 'CC BY-SA 4.0', artist: 'Yagamar' },
  ],
  'T-9': [
    { file: 'Rue de Thiès Nguinth.jpg', license: 'CC BY-SA 4.0', artist: 'GastelEtzwane' },
    { file: 'Hôpital régional Thiès 2.jpg', license: 'CC BY-SA 4.0', artist: 'Bigfall91' },
  ],
  'T-10': [
    { file: 'LaTourUGBVueSudOuest.jpg', license: 'Domaine public', artist: 'Maissambaye' },
    { file: 'UgbVillageE.jpg', license: 'CC BY-SA 3.0', artist: 'Maissambaye' },
    {
      file: 'Pont Faidherbe connecting Sor to Ndar in Saint Louis.jpg',
      license: 'CC BY-SA 4.0',
      artist: 'Issathiome',
    },
  ],
  'T-11': [
    { file: 'Ziguinchor banner.jpg', license: 'CC BY-SA 4.0', artist: 'KaaBa' },
    { file: 'Ziguinchor 294A4530 Casamance.jpg', license: 'CC BY-SA 4.0', artist: 'Christian Pirkl' },
  ],
  // Photos sans personne reconnaissable au premier plan : même sous licence
  // libre, le droit à l'image s'applique sur un support commercial.
  'T-12': [
    { file: 'Plage Popenguine.jpg', license: 'CC BY-SA 4.0', artist: 'A R 228' },
    { file: 'La falaise de popenguine 03.jpg', license: 'CC BY-SA 4.0', artist: '4MAPS' },
  ],
};

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
  for (const [referenceInterne, photos] of Object.entries(PHOTOS_BY_TERRAIN)) {
    const terrain = await prisma.terrain.findUnique({
      where: { referenceInterne },
      select: { id: true, nom: true, _count: { select: { medias: true } } },
    });
    if (!terrain) {
      console.log(`  ${referenceInterne} absent — lancer d'abord demo:terrains.`);
      continue;
    }
    if (terrain._count.medias > 0) {
      console.log(`  ${referenceInterne} possède déjà ${terrain._count.medias} média(s) — ignoré.`);
      continue;
    }

    console.log(`${referenceInterne}  ${terrain.nom}`);
    for (const [index, photo] of photos.entries()) {
      const buffer = await fetchCommonsPhoto(photo.file);
      const result = await uploadPublicImage(buffer, `mtm/terrains/${terrain.id}/media`);
      await prisma.terrainMedia.create({
        data: {
          terrainId: terrain.id,
          type: 'photo',
          storageKey: result.public_id,
          resourceType: result.resource_type,
          title: attributionLabel(photo),
          isPublic: true,
          sortOrder: index,
        },
      });
      uploaded += 1;
      console.log(`    + ${photo.file}  (${Math.round(buffer.length / 1024)} ko)`);
    }
  }

  console.log(`Photos de démonstration : ${uploaded} envoyée(s).`);
}

main()
  .catch((error) => {
    console.error('Échec de l’ajout des photos de démonstration :', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
