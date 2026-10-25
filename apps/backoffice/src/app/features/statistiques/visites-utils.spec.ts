import { courbeJours, jourCourt, lienFiche } from './visites-utils';

describe('visites-utils', () => {
  it('écrit un jour en français court', () => {
    expect(jourCourt('2026-10-25')).toBe('25 oct.');
    expect(jourCourt('2026-01-03')).toBe('3 janv.');
  });

  it('mène à la bonne fiche selon le type', () => {
    expect(lienFiche('terrain', 'abc')).toEqual(['/terrains', 'abc']);
    expect(lienFiche('location', 'abc')).toEqual(['/locatif/biens', 'abc']);
    expect(lienFiche('realisation', 'abc')).toEqual(['/content/showcase']);
  });

  it('trace une courbe par série, la seconde en pointillé', () => {
    const points = [
      { jour: '2026-10-24', a: 3, b: 8 },
      { jour: '2026-10-25', a: 5, b: 12 },
    ];
    const seule = courbeJours(points, { nomA: 'Visiteurs' }) as { series: unknown[] };
    expect(seule.series).toHaveLength(1);
    const double = courbeJours(points, { nomA: 'Visiteurs', nomB: 'Pages vues' }) as {
      series: { name: string; data: number[] }[];
    };
    expect(double.series.map((s) => s.name)).toEqual(['Visiteurs', 'Pages vues']);
    expect(double.series[1].data).toEqual([8, 12]);
  });
});
