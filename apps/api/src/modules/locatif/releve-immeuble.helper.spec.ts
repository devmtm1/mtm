import {
  calculerReleveImmeuble,
  repartirMontant,
  type ChargeReleve,
  type LogementReleve,
} from './releve-immeuble.helper';

const logement = (
  id: string,
  loyerMensuel: number,
  du: number,
  encaisse: number,
  superficie = 50,
): LogementReleve => ({
  id,
  libelle: id.toUpperCase(),
  locataire: null,
  loyerMensuel,
  superficie,
  du,
  encaisse,
});

const charge = (
  montant: number,
  repartition: ChargeReleve['repartition'],
): ChargeReleve => ({
  id: `c-${montant}-${repartition}`,
  libelle: 'Eau des parties communes',
  montant,
  dateCharge: new Date('2026-10-01T00:00:00Z'),
  repartition,
});

describe('repartirMontant', () => {
  it('garde le total exact : le reste de la division va aux premiers logements', () => {
    expect(repartirMontant(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(repartirMontant(100, [1, 1, 1]).reduce((a, b) => a + b, 0)).toBe(
      100,
    );
  });

  it('suit les poids donnés', () => {
    expect(repartirMontant(100000, [100000, 300000])).toEqual([25000, 75000]);
  });

  it('retombe sur des parts égales quand aucun poids n’est connu', () => {
    expect(repartirMontant(90, [0, 0, 0])).toEqual([30, 30, 30]);
  });

  it('ne plante pas sans logement', () => {
    expect(repartirMontant(90, [])).toEqual([]);
  });
});

describe('calculerReleveImmeuble', () => {
  const villa = [
    logement('a1', 200000, 600000, 600000),
    logement('a2', 200000, 600000, 400000),
    logement('a3', 400000, 1200000, 1200000),
  ];

  it('totalise les loyers, déduit les charges communes et donne le net du propriétaire', () => {
    const releve = calculerReleveImmeuble(villa, [
      charge(120000, 'egale'),
      charge(80000, 'globale'),
    ]);

    expect(releve.totalDu).toBe(2400000);
    expect(releve.totalEncaisse).toBe(2200000);
    expect(releve.totalSolde).toBe(200000);
    expect(releve.totalCharges).toBe(200000);
    expect(releve.net).toBe(2000000);
  });

  it('répartit « parts égales » entre tous les logements', () => {
    const releve = calculerReleveImmeuble(villa, [charge(120000, 'egale')]);

    expect(releve.logements.map((l) => l.chargesImputees)).toEqual([
      40000, 40000, 40000,
    ]);
  });

  it('répartit « au prorata du loyer » selon le loyer de chaque logement', () => {
    const releve = calculerReleveImmeuble(villa, [charge(100000, 'loyer')]);

    expect(releve.logements.map((l) => l.chargesImputees)).toEqual([
      25000, 25000, 50000,
    ]);
  });

  it('répartit « au prorata de la surface » selon les m² de chaque logement', () => {
    const avecSurfaces = [
      logement('a1', 200000, 0, 0, 40),
      logement('a2', 200000, 0, 0, 40),
      logement('a3', 400000, 0, 0, 80),
    ];
    const releve = calculerReleveImmeuble(avecSurfaces, [
      charge(160000, 'surface'),
    ]);

    expect(releve.logements.map((l) => l.chargesImputees)).toEqual([
      40000, 40000, 80000,
    ]);
  });

  it('retombe sur des parts égales quand aucune surface n’est renseignée', () => {
    const sansSurface = [
      logement('a1', 1, 0, 0, 0),
      logement('a2', 1, 0, 0, 0),
    ];
    const releve = calculerReleveImmeuble(sansSurface, [
      charge(100, 'surface'),
    ]);

    expect(releve.logements.map((l) => l.chargesImputees)).toEqual([50, 50]);
  });

  it('une charge « non répartie » pèse sur le total sans être imputée à un logement', () => {
    const releve = calculerReleveImmeuble(villa, [charge(90000, 'globale')]);

    expect(releve.logements.every((l) => l.chargesImputees === 0)).toBe(true);
    expect(releve.totalCharges).toBe(90000);
  });

  it('la somme des parts imputées égale la somme des charges réparties', () => {
    const releve = calculerReleveImmeuble(villa, [
      charge(100001, 'egale'),
      charge(77777, 'loyer'),
    ]);

    const imputees = releve.logements.reduce(
      (somme, l) => somme + l.chargesImputees,
      0,
    );
    expect(imputees).toBe(100001 + 77777);
  });

  it('un relevé sans charge laisse le net égal à l’encaissé', () => {
    const releve = calculerReleveImmeuble(villa, []);

    expect(releve.net).toBe(releve.totalEncaisse);
  });
});
