import { describe, expect, it } from 'vitest';
import type { LotPublic } from '../api/programmes';
import {
  conditionsDuLot,
  disponibilites,
  fourchettePrix,
  fourchetteSuperficie,
  lotsAffiches,
  pointsDeConditions,
  tauxEngage,
} from './programmes';

/** Les milliers sont séparés par une espace insécable : on la ramène à une espace ordinaire pour comparer. */
const sans = (texte: string) => texte.replace(/\u00a0/g, ' ');

const lot = (surcharge: Partial<LotPublic> = {}): LotPublic => ({
  id: 'l1',
  numeroLot: 'A-01',
  statut: 'Disponible',
  superficie: 300,
  uniteSuperficie: 'm²',
  categorieLot: null,
  prixPublic: 12_000_000,
  modalitePaiement: null,
  dureeMoratoireMois: null,
  acompteMontant: null,
  photo: null,
  ...surcharge,
});

describe('fourchettePrix', () => {
  it('annonce un prix unique, une fourchette, ou un prix sur demande', () => {
    expect(sans(fourchettePrix(12_000_000, 12_000_000))).toBe('12 000 000 FCFA');
    expect(sans(fourchettePrix(12_000_000, 18_000_000))).toBe('de 12 000 000 à 18 000 000 FCFA');
    expect(fourchettePrix(null, null)).toBe('Prix sur demande');
  });
});

describe('fourchetteSuperficie', () => {
  it('annonce une surface, une fourchette, ou rien quand elle n’est pas renseignée', () => {
    expect(sans(fourchetteSuperficie(250, 250, 'm²'))).toBe('250 m²');
    expect(sans(fourchetteSuperficie(250, 400, 'm²'))).toBe('de 250 à 400 m²');
    expect(fourchetteSuperficie(null, null, null)).toBe('');
  });
});

describe('disponibilités et avancement', () => {
  it('dit combien de lots restent, et signale le dernier', () => {
    expect(disponibilites({ lotsTotal: 6, lotsDisponibles: 4 })).toBe('4 lots disponibles sur 6');
    expect(disponibilites({ lotsTotal: 6, lotsDisponibles: 1 })).toBe('Dernier lot disponible');
    expect(disponibilites({ lotsTotal: 3, lotsDisponibles: 3 })).toBe('3 lots disponibles');
  });

  it('calcule la part de lots déjà réservés ou vendus, 0 sans lot', () => {
    expect(tauxEngage({ lotsTotal: 10, lotsReserves: 2, lotsVendus: 3 })).toBe(50);
    expect(tauxEngage({ lotsTotal: 0, lotsReserves: 0, lotsVendus: 0 })).toBe(0);
  });
});

describe('conditions de paiement', () => {
  it('résume celles d’un lot en une ligne, vide quand il n’y en a pas', () => {
    expect(conditionsDuLot(lot())).toBe('');
    expect(sans(conditionsDuLot(lot({ dureeMoratoireMois: 6, acompteMontant: 2_000_000 })))).toBe(
      '6 mois de moratoire · acompte 2 000 000 FCFA',
    );
  });

  it('résume celles du programme en points', () => {
    expect(
      pointsDeConditions({ modalites: ['Échelonné'], acompteMin: 2_000_000, moratoireMax: 6 }).map(sans),
    ).toEqual(['Paiement : Échelonné', 'Acompte à partir de 2 000 000 FCFA', "Moratoire jusqu'à 6 mois"]);
    expect(pointsDeConditions({ modalites: [], acompteMin: null, moratoireMax: null })).toEqual([]);
  });
});

describe('lotsAffiches', () => {
  const lots = [
    lot({ id: 'a10', numeroLot: 'A-10', prixPublic: 10_000_000, superficie: 250 }),
    lot({ id: 'a2', numeroLot: 'A-2', prixPublic: 14_000_000, superficie: 400, categorieLot: { nom: 'Angle' } }),
    lot({ id: 'b1', numeroLot: 'B-1', statut: 'Réservé', prixPublic: null }),
    lot({ id: 'a3', numeroLot: 'A-3', prixPublic: null, superficie: 300, categorieLot: { nom: 'Angle' } }),
  ];
  const ids = (critere: Parameters<typeof lotsAffiches>[1]) => lotsAffiches(lots, critere).map((l) => l.id);

  it('range par numéro naturel (A-2 avant A-10), les lots non disponibles à la fin', () => {
    expect(ids({ categorie: '', seulementDisponibles: false, tri: 'numero' })).toEqual(['a2', 'a3', 'a10', 'b1']);
  });

  it('masque les lots réservés ou vendus quand on ne veut que les disponibles', () => {
    expect(ids({ categorie: '', seulementDisponibles: true, tri: 'numero' })).toEqual(['a2', 'a3', 'a10']);
  });

  it('filtre par catégorie', () => {
    expect(ids({ categorie: 'Angle', seulementDisponibles: true, tri: 'numero' })).toEqual(['a2', 'a3']);
  });

  it('trie par prix, un prix absent passant toujours après les autres', () => {
    expect(ids({ categorie: '', seulementDisponibles: true, tri: 'prix_asc' })).toEqual(['a10', 'a2', 'a3']);
    expect(ids({ categorie: '', seulementDisponibles: true, tri: 'prix_desc' })).toEqual(['a2', 'a10', 'a3']);
  });

  it('trie par superficie décroissante', () => {
    expect(ids({ categorie: '', seulementDisponibles: true, tri: 'superficie_desc' })).toEqual(['a2', 'a3', 'a10']);
  });
});
