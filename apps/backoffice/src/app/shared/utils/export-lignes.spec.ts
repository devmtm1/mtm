import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { chargerToutesLesPages, isoJour, sourceDepuisLignes } from './export-lignes';

interface Bien {
  nom: string;
  prix: number | null;
  vendu: string | null;
}

describe('sourceDepuisLignes', () => {
  const biens: Bien[] = [
    { nom: 'Terrain A', prix: 5_000_000, vendu: '2026-10-15T00:00:00.000Z' },
    { nom: 'Terrain B', prix: null, vendu: null },
  ];

  it('donne à chaque colonne une clé, son type et la valeur de chaque ligne', () => {
    const source = sourceDepuisLignes<Bien>(
      { module: 'terrains', titre: 'Biens' },
      [
        { libelle: 'Bien', valeur: (b) => b.nom },
        { libelle: 'Prix (FCFA)', type: 'montant', valeur: (b) => b.prix },
        { libelle: 'Vendu le', type: 'date', valeur: (b) => isoJour(b.vendu) },
      ],
      biens,
    );

    expect(source.colonnes).toEqual([
      { cle: 'c0', libelle: 'Bien', type: 'texte' },
      { cle: 'c1', libelle: 'Prix (FCFA)', type: 'montant' },
      { cle: 'c2', libelle: 'Vendu le', type: 'date' },
    ]);
    expect(source.lignes[0]).toEqual({ c0: 'Terrain A', c1: 5_000_000, c2: '2026-10-15' });
    expect(source.lignes[1]).toEqual({ c0: 'Terrain B', c1: null, c2: null });
  });

  it('range une valeur absente ou vide en cellule vide', () => {
    const source = sourceDepuisLignes<{ a?: string }>({ module: 'terrains', titre: 'T' }, [{ libelle: 'A', valeur: (l) => l.a }], [{}, { a: '' }]);
    expect(source.lignes).toEqual([{ c0: null }, { c0: null }]);
  });
});

describe('chargerToutesLesPages', () => {
  const total = 450;
  const page = vi.fn((numero: number, taille: number) => {
    const debut = (numero - 1) * taille;
    const items = Array.from({ length: Math.max(0, Math.min(taille, total - debut)) }, (_, i) => debut + i);
    return of({ items, total });
  });

  it('enchaîne les pages jusqu’à la dernière', async () => {
    page.mockClear();
    const lignes = await firstValueFrom(chargerToutesLesPages(page, 200));
    expect(lignes).toHaveLength(450);
    expect(lignes[0]).toBe(0);
    expect(lignes[449]).toBe(449);
    expect(page).toHaveBeenCalledTimes(3);
  });

  it('une seule page quand tout tient dedans', async () => {
    const une = vi.fn(() => of({ items: [1, 2, 3], total: 3 }));
    expect(await firstValueFrom(chargerToutesLesPages(une, 200))).toEqual([1, 2, 3]);
    expect(une).toHaveBeenCalledTimes(1);
  });

  it('s’arrête au plafond d’un export, plus une ligne pour signaler le dépassement', async () => {
    const enorme = (numero: number, taille: number) => of({ items: Array.from({ length: taille }, (_, i) => (numero - 1) * taille + i), total: 100_000 });
    const lignes = await firstValueFrom(chargerToutesLesPages(enorme, 200, 1000));
    expect(lignes).toHaveLength(1001);
  });

  it('une liste vide donne zéro ligne', async () => {
    expect(await firstValueFrom(chargerToutesLesPages(() => of({ items: [], total: 0 }), 200))).toEqual([]);
  });
});

describe('isoJour', () => {
  it('ne garde que le jour', () => {
    expect(isoJour('2026-10-15T00:00:00.000Z')).toBe('2026-10-15');
    expect(isoJour(null)).toBeNull();
    expect(isoJour(undefined)).toBeNull();
  });
});
