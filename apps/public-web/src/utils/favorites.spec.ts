import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isFavorite,
  readFavorites,
  removeFavorite,
  subscribeFavorites,
  toggleFavorite,
} from './favorites';

describe('favoris', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('commence sans aucun favori', () => {
    expect(readFavorites()).toEqual([]);
  });

  it('ajoute puis retire un bien, et dit son nouvel état', () => {
    expect(toggleFavorite('terrain', 't1')).toBe(true);
    expect(isFavorite(readFavorites(), 'terrain', 't1')).toBe(true);
    expect(toggleFavorite('terrain', 't1')).toBe(false);
    expect(readFavorites()).toEqual([]);
  });

  it('distingue un bien à vendre d’une location de même identifiant', () => {
    toggleFavorite('terrain', 'x');
    expect(isFavorite(readFavorites(), 'location', 'x')).toBe(false);
    toggleFavorite('location', 'x');
    expect(readFavorites()).toHaveLength(2);
  });

  it('place le dernier ajouté en premier', () => {
    toggleFavorite('terrain', 'a');
    toggleFavorite('location', 'b');
    expect(readFavorites().map((entry) => entry.id)).toEqual(['b', 'a']);
  });

  it('retire un favori précis sans toucher aux autres', () => {
    toggleFavorite('terrain', 'a');
    toggleFavorite('location', 'b');
    removeFavorite('terrain', 'a');
    expect(readFavorites().map((entry) => entry.id)).toEqual(['b']);
  });

  it('ignore un stockage corrompu ou aux entrées invalides', () => {
    window.localStorage.setItem('mtm:favoris:v1', '{pas du json');
    expect(readFavorites()).toEqual([]);
    window.localStorage.setItem(
      'mtm:favoris:v1',
      JSON.stringify([
        { kind: 'terrain', id: 'ok', addedAt: 1 },
        { kind: 'inconnu', id: 'x', addedAt: 1 },
        { kind: 'terrain', id: '', addedAt: 1 },
        'texte',
        null,
      ]),
    );
    expect(readFavorites().map((entry) => entry.id)).toEqual(['ok']);
  });

  it('prévient les abonnés à chaque changement, et plus après désabonnement', () => {
    const callback = vi.fn();
    const stop = subscribeFavorites(callback);
    toggleFavorite('terrain', 'a');
    expect(callback).toHaveBeenCalledTimes(1);
    stop();
    toggleFavorite('terrain', 'b');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('continue de fonctionner quand le stockage refuse l’écriture', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota dépassé');
    });
    expect(() => toggleFavorite('terrain', 'a')).not.toThrow();
    setItem.mockRestore();
  });
});
