import { describe, expect, it } from 'vitest';
import { CATEGORIES_CATALOGUE, SEUIL_HECTARES_M2, adresseCategorie } from './categoriesCatalogue';

describe('rubriques du catalogue', () => {
  it('ouvre le catalogue sur la rubrique demandée', () => {
    expect(adresseCategorie('/terrains', 'hectares')).toBe('/terrains?categorie=hectares');
    expect(adresseCategorie('/terrains', 'terrains_villas')).toBe('/terrains?categorie=terrains_villas');
  });

  it('dit le seuil en toutes lettres : plus de 500 m²', () => {
    expect(SEUIL_HECTARES_M2).toBe(500);
    expect(CATEGORIES_CATALOGUE.hectares.description).toContain('500');
    expect(CATEGORIES_CATALOGUE.hectares.libelle).toBe('Nos hectares');
  });
});
