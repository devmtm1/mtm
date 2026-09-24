import { describe, expect, it } from 'vitest';
import { countryFlag, parseTestimonialAuthor } from './countryFlag';

describe('drapeau des témoignages de la diaspora', () => {
  it('sépare le nom et le pays au format « Nom | Pays »', () => {
    expect(parseTestimonialAuthor('Awa Diop | France')).toEqual({
      name: 'Awa Diop',
      country: 'France',
    });
  });

  it('reste rétrocompatible avec un témoignage sans pays', () => {
    // Format historique des témoignages déjà saisis en back-office.
    expect(parseTestimonialAuthor('Aminata N., Dakar')).toEqual({
      name: 'Aminata N., Dakar',
      country: null,
    });
  });

  it('retrouve un drapeau malgré accents, casse et apostrophe courbe', () => {
    expect(countryFlag('France')).toBe('🇫🇷');
    expect(countryFlag('SÉNÉGAL')).toBe('🇸🇳');
    expect(countryFlag("Côte d’Ivoire")).toBe('🇨🇮');
    expect(countryFlag(" états-unis ")).toBe('🇺🇸');
  });

  it('n’affiche aucun drapeau pour un pays non reconnu, plutôt qu’un mauvais', () => {
    expect(countryFlag('Ruritanie')).toBeNull();
  });
});
