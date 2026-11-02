import type { Prisma } from '@prisma/client';

/** Au-delà de cette superficie (en m²), un terrain entre dans « Nos hectares » : les grandes surfaces. */
export const SEUIL_HECTARES_M2 = 500;

/**
 * Les deux rubriques d'entrée du catalogue public :
 *  - `hectares` : les terrains dont la superficie dépasse le seuil ;
 *  - `terrains_villas` : les terrains qui ne le dépassent pas, et les villas.
 * Un terrain n'est ainsi que dans l'une des deux ; une villa reste dans « terrains et villas ».
 */
export type CategorieCatalogue = 'hectares' | 'terrains_villas';

export function filtreCategorie(
  categorie: CategorieCatalogue,
): Prisma.TerrainWhereInput {
  if (categorie === 'hectares') {
    return { typeBien: 'terrain', superficie: { gt: SEUIL_HECTARES_M2 } };
  }
  return {
    OR: [
      {
        typeBien: 'terrain',
        // Superficie inconnue : le terrain n'est pas une grande surface, on le garde dans les terrains.
        OR: [{ superficie: { lte: SEUIL_HECTARES_M2 } }, { superficie: null }],
      },
      { typeBien: 'villa' },
    ],
  };
}
