import type { TerrainFilters } from '../types/terrain';

/** Au-delà de cette superficie (m²), un terrain entre dans « Nos hectares » : les grandes surfaces. Le même seuil que l'API. */
export const SEUIL_HECTARES_M2 = 500;

export type CategorieCatalogue = NonNullable<TerrainFilters['categorie']>;

export const CATEGORIES_CATALOGUE: Record<CategorieCatalogue, { libelle: string; description: string }> = {
  hectares: {
    libelle: 'Nos hectares',
    description: `Les grandes surfaces à vendre : terrains de plus de ${SEUIL_HECTARES_M2.toLocaleString('fr-FR')} m².`,
  },
  terrains_villas: {
    libelle: 'Terrains & villas',
    description: `Les terrains jusqu'à ${SEUIL_HECTARES_M2.toLocaleString('fr-FR')} m² et les villas à vendre.`,
  },
};

/** Adresse du catalogue ouvert sur une rubrique (les boutons de l'accueil). */
export function adresseCategorie(catalogue: string, categorie: CategorieCatalogue): string {
  return `${catalogue}?categorie=${categorie}`;
}
