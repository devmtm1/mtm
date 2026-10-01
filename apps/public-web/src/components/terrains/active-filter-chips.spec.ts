import { describe, expect, it } from 'vitest';
import { activeFilterChips } from './active-filter-chips';

/**
 * Les puces résument les filtres actifs et permettent de les retirer un à un.
 * Un filtre sans puce resterait armé sans que le visiteur puisse le voir ni
 * l'annuler — c'est ce qui comptait le plus à vérifier en ouvrant le
 * catalogue aux villas.
 */
describe('puces des filtres actifs', () => {
  it('annonce la nature du bien en premier, dans les mots du visiteur', () => {
    const chips = activeFilterChips({ typeBien: 'villa', region: 'Thiès' });

    expect(chips[0]).toEqual({ key: 'typeBien', label: 'Villa', clears: ['typeBien'] });
    expect(chips[1].key).toBe('region');
  });

  it('porte la typologie d’un bien bâti', () => {
    const chips = activeFilterChips({ nombrePieces: 'F3' });

    expect(chips).toEqual([{ key: 'nombrePieces', label: 'F3', clears: ['nombrePieces'] }]);
  });

  it('ne produit aucune puce sans filtre', () => {
    expect(activeFilterChips({})).toEqual([]);
  });

  it('résume une fourchette de superficie en une seule puce', () => {
    const chips = activeFilterChips({ superficieMin: 200, superficieMax: 500 });

    expect(chips).toHaveLength(1);
    expect(chips[0].clears).toEqual(['superficieMin', 'superficieMax']);
  });
});
