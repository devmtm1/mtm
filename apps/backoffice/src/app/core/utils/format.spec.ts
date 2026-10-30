import { describe, expect, it } from 'vitest';
import { montantFcfa, nombreFr } from './format';

const FINE = String.fromCharCode(0x202f);
const INSECABLE = String.fromCharCode(0x00a0);

describe('nombreFr', () => {
  it('sépare les milliers par une espace insécable ordinaire', () => {
    expect(nombreFr(41000000)).toBe(['41', '000', '000'].join(INSECABLE));
  });

  it('ne produit jamais d’espace fine insécable', () => {
    expect(nombreFr(1234567.5, { maximumFractionDigits: 1 })).not.toContain(FINE);
  });

  it('garde la virgule décimale française', () => {
    expect(nombreFr(12.5, { maximumFractionDigits: 1 })).toBe('12,5');
  });
});

describe('montantFcfa', () => {
  it('colle l’unité au montant', () => {
    expect(montantFcfa(120000)).toBe(['120', '000'].join(INSECABLE) + INSECABLE + 'FCFA');
  });
});
