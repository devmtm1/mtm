import { beforeEach, describe, expect, it, vi } from 'vitest';
import { estErreurDeChargement, rechargerSiVersionPerimee } from './version-perimee';

describe('version périmée après un déploiement', () => {
  beforeEach(() => sessionStorage.clear());

  it('reconnaît l’échec de chargement d’un écran', () => {
    expect(
      estErreurDeChargement(new TypeError('Failed to fetch dynamically imported module: https://admin.exemple.com/chunk-AB12.js')),
    ).toBe(true);
    expect(estErreurDeChargement(new Error('Importing a module script failed.'))).toBe(true);
    expect(estErreurDeChargement(new Error('Loading chunk 12 failed.'))).toBe(true);
  });

  it('laisse passer les autres erreurs', () => {
    expect(estErreurDeChargement(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(estErreurDeChargement(null)).toBe(false);
  });

  it('recharge une fois, puis plus pendant une minute', () => {
    const recharger = vi.fn();
    expect(rechargerSiVersionPerimee(1_000_000, recharger)).toBe(true);
    expect(rechargerSiVersionPerimee(1_030_000, recharger)).toBe(false);
    expect(recharger).toHaveBeenCalledTimes(1);
    expect(rechargerSiVersionPerimee(1_070_000, recharger)).toBe(true);
    expect(recharger).toHaveBeenCalledTimes(2);
  });
});
