import { comparaisonCourte, comparaisonDite, fcfa, libelleActivite, libelleCategorie, presets, repartitionRevenu, tendanceDe, variation, variationDite } from './finances-utils';

describe('périodes proposées', () => {
  const maintenant = new Date(2026, 9, 12); // 12 octobre 2026

  it('propose le mois, le mois précédent, le trimestre, l’année et douze mois', () => {
    const parCode = Object.fromEntries(presets(maintenant).map((p) => [p.code, p]));
    expect(parCode['mois']).toMatchObject({ du: '2026-10-01', au: '2026-10-12' });
    expect(parCode['mois-precedent']).toMatchObject({ du: '2026-09-01', au: '2026-09-30' });
    expect(parCode['trimestre']).toMatchObject({ du: '2026-10-01', au: '2026-10-12' });
    expect(parCode['annee']).toMatchObject({ du: '2026-01-01', au: '2026-10-12' });
    expect(parCode['douze-mois'].du).toBe('2025-11-01');
  });

  it('le mois précédent de janvier est décembre de l’année d’avant', () => {
    const parCode = Object.fromEntries(presets(new Date(2026, 0, 5)).map((p) => [p.code, p]));
    expect(parCode['mois-precedent']).toMatchObject({ du: '2025-12-01', au: '2025-12-31' });
  });

  it('ne dépasse jamais la limite de 366 jours de l’API', () => {
    for (const p of presets(new Date(2026, 11, 31))) {
      const jours = (new Date(p.au).getTime() - new Date(p.du).getTime()) / 86_400_000 + 1;
      expect(jours).toBeLessThanOrEqual(366);
    }
  });
});

describe('mises en forme', () => {
  it('écrit les montants en FCFA avec espaces insécables', () => {
    expect(fcfa(1250000)).toBe('1 250 000 FCFA');
    expect(fcfa(0)).toBe('0 FCFA');
  });

  it('lit les codes en clair', () => {
    expect(libelleActivite('locatif')).toBe('Gestion locative');
    expect(libelleActivite('autre')).toBe('autre');
    expect(libelleCategorie('loyer_bureaux')).toBe('Loyer bureaux');
  });

  it('compare deux périodes', () => {
    expect(variation(150, 100)).toBe(50);
    expect(variation(50, 100)).toBe(-50);
    expect(variation(10, 0)).toBeNull();
    expect(variation(0, 0)).toBe(0);
    expect(variationDite(150, 100)).toBe('+50 %');
    expect(variationDite(80, 100)).toBe('-20 %');
    expect(variationDite(10, 0)).toBe('nouveau');
    expect(variationDite(0, 0)).toBe('stable');
    expect(comparaisonDite(150, 100)).toBe('+50 % par rapport à la période précédente');
    expect(comparaisonDite(0, 0)).toBe('Stable par rapport à la période précédente');
    expect(comparaisonDite(10, 0)).toBe('Rien sur la période précédente : pas de comparaison');
  });

  it('ne répartit que les activités qui ont un revenu', () => {
    expect(
      repartitionRevenu([
        { activite: 'vente', revenu: 100, encaissements: 0, depenses: 0, resultat: 0 },
        { activite: 'locatif', revenu: 0, encaissements: 5, depenses: 0, resultat: 0 },
      ]),
    ).toEqual([{ label: 'Vente de biens', valeur: 100 }]);
  });
});

describe('tendance d’un chiffre', () => {
  it('dit hausse, baisse ou stable, et « neutre » quand la période précédente est vide', () => {
    expect(tendanceDe(150, 100)).toBe('hausse');
    expect(tendanceDe(80, 100)).toBe('baisse');
    expect(tendanceDe(100, 100)).toBe('stable');
    expect(tendanceDe(0, 0)).toBe('stable');
    expect(tendanceDe(200000, 0)).toBe('neutre');
  });

  it('résume une comparaison impossible en trois mots', () => {
    expect(comparaisonCourte(200000, 0)).toBe('Période précédente vide');
    expect(comparaisonCourte(150, 100)).toBe('+50 % par rapport à la période précédente');
  });
});
