import { describe, expect, it } from 'vitest';
import { afficherNumero, lienAppel, NUMEROS_MTM } from './numeros';

describe('numéros de MTM', () => {
  it('liste les trois numéros dans l’ordre', () => {
    expect(NUMEROS_MTM).toEqual(['785226565', '774900202', '783662651']);
  });

  it('les affiche avec l’indicatif du Sénégal', () => {
    expect(afficherNumero('785226565')).toBe('+221 78 522 65 65');
    expect(afficherNumero('774900202')).toBe('+221 77 490 02 02');
    expect(afficherNumero('+221 78 366 26 51')).toBe('+221 78 366 26 51');
  });

  it('construit le lien d’appel international', () => {
    expect(lienAppel('785226565')).toBe('tel:+221785226565');
    expect(lienAppel('+221 77 490 02 02')).toBe('tel:+221774900202');
  });
});
