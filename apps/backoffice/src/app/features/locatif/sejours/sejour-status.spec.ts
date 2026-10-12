import { formatJour, libelle, nomBien, nomVoyageur, periodeSejour } from './sejour-status';

describe('sejour-status', () => {
  it('formate un jour ISO sans décalage de fuseau', () => {
    expect(formatJour('2026-10-15T00:00:00.000Z')).toBe('15/10/2026');
    expect(formatJour('2026-01-02')).toBe('02/01/2026');
    expect(formatJour(null)).toBe('—');
  });

  it('résume la période d’un séjour', () => {
    expect(periodeSejour({ dateArrivee: '2026-10-15T00:00:00.000Z', dateDepart: '2026-10-18T00:00:00.000Z', nuits: 3 })).toBe(
      '15/10 → 18/10 · 3 nuits',
    );
    expect(periodeSejour({ dateArrivee: '2026-10-15', dateDepart: '2026-10-16', nuits: 1 })).toBe('15/10 → 16/10 · 1 nuit');
  });

  it('désigne le bien par son titre, sinon par son type et sa commune', () => {
    expect(nomBien({ titre: 'Appartement vue mer', type: 'appartement', commune: 'Ngor' })).toBe('Appartement vue mer');
    expect(nomBien({ titre: null, type: 'villa', commune: 'Saly' })).toBe('villa · Saly');
  });

  it('nomme le voyageur et retombe sur la valeur brute d’un libellé inconnu', () => {
    expect(nomVoyageur({ firstName: 'Julie', lastName: 'Martin' })).toBe('Julie Martin');
    expect(nomVoyageur(null)).toBe('—');
    expect(libelle({ airbnb: 'Airbnb' }, 'airbnb')).toBe('Airbnb');
    expect(libelle({ airbnb: 'Airbnb' }, 'inconnu')).toBe('inconnu');
  });
});
