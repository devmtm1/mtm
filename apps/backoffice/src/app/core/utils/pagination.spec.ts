import { describe, expect, it } from 'vitest';
import { fenetrePages, pageDe, plageAffichee } from './pagination';

describe('fenetrePages', () => {
  it('montre tous les numéros jusqu’à sept pages', () => {
    expect(fenetrePages(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(fenetrePages(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('abrège le milieu quand on est au début', () => {
    expect(fenetrePages(1, 20)).toEqual([1, 2, '…', 20]);
  });

  it('abrège de chaque côté quand on est au milieu', () => {
    expect(fenetrePages(10, 20)).toEqual([1, '…', 9, 10, 11, '…', 20]);
  });

  it('abrège le début quand on est à la fin', () => {
    expect(fenetrePages(20, 20)).toEqual([1, '…', 19, 20]);
  });

  it('n’écrit pas « … » à la place d’un seul numéro', () => {
    expect(fenetrePages(4, 20)).toEqual([1, 2, 3, 4, 5, '…', 20]);
  });

  it('une seule page donne un seul numéro', () => {
    expect(fenetrePages(1, 1)).toEqual([1]);
  });
});

describe('plageAffichee', () => {
  it('donne les rangs de la page', () => {
    expect(plageAffichee(2, 25, 132)).toEqual({ debut: 26, fin: 50 });
  });

  it('la dernière page s’arrête au total', () => {
    expect(plageAffichee(6, 25, 132)).toEqual({ debut: 126, fin: 132 });
  });

  it('une liste vide n’affiche aucun rang', () => {
    expect(plageAffichee(1, 25, 0)).toEqual({ debut: 0, fin: 0 });
  });
});

describe('pageDe', () => {
  const liste = Array.from({ length: 53 }, (_, i) => i + 1);

  it('découpe la liste en pages', () => {
    expect(pageDe(liste, 1, 25)).toHaveLength(25);
    expect(pageDe(liste, 3, 25)).toEqual([51, 52, 53]);
  });

  it('une page au-delà de la dernière ramène à la dernière', () => {
    expect(pageDe(liste, 9, 25)).toEqual([51, 52, 53]);
  });

  it('une liste vide donne une page vide', () => {
    expect(pageDe([], 1, 25)).toEqual([]);
  });
});
