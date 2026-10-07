import { describe, expect, it } from 'vitest';
import { formatMoney, formatSuperficie, groupDigits } from './format';

describe('montants lisibles', () => {
  it('sépare les milliers par une espace insécable ordinaire, jamais par l’espace fine', () => {
    const texte = formatMoney(18500000);
    expect(texte).toBe('18 500 000 FCFA');
    expect(texte).not.toContain(' ');
  });

  it('applique la même règle aux superficies et aux nombres', () => {
    expect(formatSuperficie(12500, 'm²')).toBe('12 500 m²');
    expect(groupDigits(1234567)).toBe('1 234 567');
  });

  it('un petit montant n’a pas de séparateur, un prix sur demande reste lisible', () => {
    expect(formatMoney(950)).toBe('950 FCFA');
    expect(formatMoney(null)).toBe('Prix sur demande');
  });
});
