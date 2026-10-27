import { describe, expect, it } from 'vitest';
import { locationCard, mergeRecent, terrainCard } from './recent-properties';
import type { Terrain } from '../../types/terrain';
import type { Location } from '../../types/location';

const terrain = (id: string, createdAt: string, extra: Partial<Terrain> = {}): Terrain =>
  ({
    id,
    nom: `Terrain ${id}`,
    commune: 'Mbour',
    region: 'Thiès',
    prixPublic: 15000000,
    createdAt,
    medias: [{ id: 'm', type: 'photo', secureUrl: `https://img/${id}.jpg` }],
    ...extra,
  }) as unknown as Terrain;

const location = (id: string, publieLe: string | null, extra: Partial<Location> = {}): Location =>
  ({
    id,
    type: 'appartement',
    titre: null,
    commune: 'Ngor',
    region: 'Dakar',
    loyerMensuel: 350000,
    publieLe,
    medias: [],
    ...extra,
  }) as unknown as Location;

describe('repères des cartes (chambres, salles d’eau, surface)', () => {
  it('un bien bâti montre chambres, salles d’eau et surface habitable', () => {
    const card = terrainCard(
      terrain('v1', '2026-10-01T00:00:00Z', {
        typeBien: 'villa',
        nombreChambres: 4,
        nombreSallesEau: 3,
        surfaceHabitable: 250,
        superficie: 400,
        uniteSuperficie: 'm²',
      }),
    );
    expect(card.facts?.map((fact) => fact.label.replace(/\s/g, ' '))).toEqual(['4 ch.', '3 sdb.', '250 m²']);
  });

  it('une parcelle nue ne montre que sa superficie, sans « 0 ch. » ni tiret', () => {
    const card = terrainCard(
      terrain('t9', '2026-10-01T00:00:00Z', { superficie: 600, uniteSuperficie: 'm²', nombreChambres: null, nombreSallesEau: 0 }),
    );
    expect(card.facts).toEqual([{ icon: 'surface', label: '600 m²' }]);
  });

  it('une location reprend ses chambres et sa surface, et rien quand elle ne renseigne rien', () => {
    expect(locationCard(location('l2', null, { nombreChambres: 2, nombreSallesEau: 1, superficie: 85 })).facts).toEqual([
      { icon: 'chambres', label: '2 ch.' },
      { icon: 'sallesEau', label: '1 sdb.' },
      { icon: 'surface', label: '85 m²' },
    ]);
    expect(locationCard(location('l3', null)).facts).toEqual([]);
  });
});

describe('cartes de l’accueil mobile', () => {
  it('une vente n’a pas de badge d’offre, mais son prix et sa photo', () => {
    const card = terrainCard(terrain('t1', '2026-10-01T00:00:00Z'));
    expect(card).toMatchObject({
      kind: 'terrain',
      to: '/terrains/t1',
      place: 'Mbour, Thiès',
      images: ['https://img/t1.jpg'],
    });
    expect(card.price.replace(/\s/g, ' ')).toBe('15 000 000 FCFA');
    expect(card.priceSuffix).toBeUndefined();
  });

  it('une courte durée affiche le prix de la nuit, pas un loyer mensuel', () => {
    const card = locationCard(
      location('l9', null, { modeLocation: 'courte_duree', prixNuit: 45000, loyerMensuel: null }),
    );
    expect(card.price.replace(/\s/g, ' ')).toBe('45 000 FCFA');
    expect(card.priceSuffix).toBe('/ nuit');
    expect(
      locationCard(location('l10', null, { modeLocation: 'courte_duree', prixNuit: null })).priceSuffix,
    ).toBeUndefined();
  });

  it('une location porte « Location », son loyer mensuel et un titre de repli', () => {
    const card = locationCard(location('l1', null));
    expect(card).toMatchObject({
      kind: 'location',
      badge: 'Location',
      badgeTone: 'success',
      to: '/locations/l1',
      title: 'Appartement à Ngor',
      priceSuffix: '/ mois',
    });
    expect(card.price.replace(/\s/g, ' ')).toBe('350 000 FCFA');
  });

  it('sans loyer, aucune période n’est affichée', () => {
    const card = locationCard(location('l1', null, { loyerMensuel: null }));
    expect(card.price).toBe('Loyer sur demande');
    expect(card.priceSuffix).toBeUndefined();
  });

  it('mêle ventes et locations, la plus récente en premier', () => {
    const cards = mergeRecent(
      [terrain('t-ancien', '2026-08-01T00:00:00Z'), terrain('t-recent', '2026-10-03T00:00:00Z')],
      [location('l-milieu', '2026-09-15T00:00:00Z')],
    );
    expect(cards.map((card) => card.id)).toEqual(['t-recent', 'l-milieu', 't-ancien']);
  });

  it('une date illisible place le bien en fin de rangée sans le faire disparaître', () => {
    const cards = mergeRecent(
      [terrain('t-daté', '2026-10-03T00:00:00Z')],
      [location('l-sans-date', null), location('l-invalide', 'pas une date')],
    );
    expect(cards[0].id).toBe('t-daté');
    expect(cards.map((card) => card.id).sort()).toEqual(['l-invalide', 'l-sans-date', 't-daté']);
  });

  it('limite la rangée au nombre demandé', () => {
    const terrains = Array.from({ length: 10 }, (_, i) => terrain(`t${i}`, `2026-10-${String(i + 1).padStart(2, '0')}T00:00:00Z`));
    expect(mergeRecent(terrains, [], 4)).toHaveLength(4);
  });

  describe('badge « mis en avant »', () => {
    it('une vente mise en avant le dit ; une vente ordinaire non', () => {
      expect(terrainCard(terrain('t1', '2026-10-01T00:00:00Z', { misEnAvant: true })).featured).toBe('Mis en avant');
      expect(terrainCard(terrain('t2', '2026-10-01T00:00:00Z', { misEnAvant: false })).featured).toBeUndefined();
    });

    it('une location mise en avant est « À la une »', () => {
      expect(locationCard(location('l1', null, { misEnAvant: true })).featured).toBe('À la une');
      expect(locationCard(location('l2', null, { misEnAvant: false })).featured).toBeUndefined();
    });
  });
});
