import { describe, expect, it } from 'vitest';
import { activeLocationChips } from './location-filter-chips';

describe('activeLocationChips', () => {
  it('ne produit rien sans filtre', () => {
    expect(activeLocationChips({})).toEqual([]);
    // La pagination et le tri ne sont pas des critères.
    expect(activeLocationChips({ page: 3, pageSize: 12, sortBy: 'loyerMensuel', sortOrder: 'asc' })).toEqual([]);
  });

  it('résume une fourchette de loyer en une seule puce qui efface les deux bornes', () => {
    const [chip] = activeLocationChips({ loyerMin: 200000, loyerMax: 400000 });
    expect(chip.key).toBe('loyer');
    expect(chip.clears).toEqual(['loyerMin', 'loyerMax']);
    expect(chip.label.replace(/\s/g, ' ')).toBe('200 000 FCFA – 400 000 FCFA');
  });

  it('décrit une borne seule', () => {
    expect(activeLocationChips({ loyerMax: 300000 })[0].label.replace(/\s/g, ' ')).toBe('≤ 300 000 FCFA');
    expect(activeLocationChips({ loyerMin: 150000 })[0].label.replace(/\s/g, ' ')).toBe('≥ 150 000 FCFA');
  });

  it('nomme chaque critère lisiblement', () => {
    const chips = activeLocationChips({
      type: 'appartement',
      region: 'Dakar',
      commune: 'Ngor',
      chambresMin: 2,
      superficieMin: 60,
      meuble: false,
      search: 'calme',
    });
    expect(chips.map((chip) => chip.label)).toEqual([
      'Appartement',
      'Dakar',
      'Ngor',
      '2+ chambres',
      '≥ 60 m²',
      'Non meublé',
      '« calme »',
    ]);
  });

  it('distingue « meublé » de « non meublé » même quand la valeur est fausse', () => {
    expect(activeLocationChips({ meuble: true })[0].label).toBe('Meublé');
    expect(activeLocationChips({ meuble: false })[0].label).toBe('Non meublé');
  });
});
