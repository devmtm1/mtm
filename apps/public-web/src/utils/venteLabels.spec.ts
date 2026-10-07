import { describe, expect, it } from 'vitest';
import { estVendu, venduLabel } from './venteLabels';

describe('venteLabels', () => {
  it('donne le mois de la vente quand il est connu', () => {
    expect(venduLabel('2026-10-15T00:00:00Z')).toBe('Vendu en octobre 2026');
  });

  it('reste « Vendu » sans date', () => {
    expect(venduLabel(null)).toBe('Vendu');
    expect(venduLabel(undefined)).toBe('Vendu');
  });

  it('reconnaît un bien vendu', () => {
    expect(estVendu({ statutCommercial: 'Vendu' })).toBe(true);
    expect(estVendu({ statutCommercial: 'Disponible' })).toBe(false);
    expect(estVendu({})).toBe(false);
  });
});
