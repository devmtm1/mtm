import { describe, expect, it } from 'vitest';
import { conditionsDuLot, fourchettePrix } from './programmes';

/** Les milliers sont séparés par une espace insécable : on la ramène à une espace ordinaire pour comparer. */
const sans = (texte: string) => texte.replace(/\u00a0/g, ' ');

describe('fourchettePrix', () => {
  it('annonce un prix unique, une fourchette, ou un prix sur demande', () => {
    expect(sans(fourchettePrix(12_000_000, 12_000_000))).toBe('12 000 000 FCFA');
    expect(sans(fourchettePrix(12_000_000, 18_000_000))).toBe('de 12 000 000 à 18 000 000 FCFA');
    expect(fourchettePrix(null, null)).toBe('Prix sur demande');
  });
});

describe('conditionsDuLot', () => {
  const base = {
    id: 'l1',
    numeroLot: 'A-01',
    superficie: 300,
    uniteSuperficie: 'm²',
    prixPublic: 12_000_000,
    modalitePaiement: null,
    dureeMoratoireMois: null,
    acompteMontant: null,
    categorieLot: null,
  };

  it('résume les conditions en une ligne, vide quand il n’y en a pas', () => {
    expect(conditionsDuLot(base)).toBe('');
    expect(sans(conditionsDuLot({ ...base, dureeMoratoireMois: 6, acompteMontant: 2_000_000 }))).toBe(
      '6 mois de moratoire · acompte 2 000 000 FCFA',
    );
  });
});
