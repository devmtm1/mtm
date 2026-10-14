import {
  SEUILS_BLOCAGE_DEFAUT,
  classer,
  derniersMois,
  formaterDate,
  formaterMontant,
  formaterNombre,
  formaterPourcentage,
  joursEntre,
  limiteDepuis,
  lireSeuils,
  moyenne,
  nomFichier,
  serieParMois,
  tauxPourcent,
  texteCellule,
  variationPourcent,
} from './pilotage.calculs';

describe('seuils de blocage', () => {
  it('reprend les défauts sans paramètre', () => {
    expect(lireSeuils(undefined)).toEqual(SEUILS_BLOCAGE_DEFAUT);
    expect(lireSeuils([1, 2])).toEqual(SEUILS_BLOCAGE_DEFAUT);
  });

  it('prend les valeurs valides et ignore les absurdes', () => {
    expect(
      lireSeuils({
        vente: 30,
        mission: 0,
        chantier: -2,
        prospect: 'dix',
        tache: 1.5,
      }),
    ).toEqual({
      ...SEUILS_BLOCAGE_DEFAUT,
      vente: 30,
    });
    expect(lireSeuils({ prospect: 366 })).toEqual(SEUILS_BLOCAGE_DEFAUT);
  });

  it('calcule la date limite et les jours écoulés', () => {
    const maintenant = new Date('2026-10-20T12:00:00Z');
    expect(limiteDepuis(15, maintenant).toISOString()).toBe(
      '2026-10-05T12:00:00.000Z',
    );
    expect(joursEntre(new Date('2026-10-05T12:00:00Z'), maintenant)).toBe(15);
    expect(joursEntre(new Date('2026-10-25T00:00:00Z'), maintenant)).toBe(0);
  });
});

describe('pourcentages et moyennes', () => {
  it('donne un taux à une décimale, ou null sans base', () => {
    expect(tauxPourcent(1, 3)).toBe(33.3);
    expect(tauxPourcent(5, 0)).toBeNull();
    expect(tauxPourcent(0, 10)).toBe(0);
  });

  it('compare deux périodes', () => {
    expect(variationPourcent(150, 100)).toBe(50);
    expect(variationPourcent(50, 100)).toBe(-50);
    expect(variationPourcent(5, 0)).toBeNull();
    expect(variationPourcent(0, 0)).toBe(0);
  });

  it('moyenne arrondie, null sans valeur', () => {
    expect(moyenne([10, 20, 31])).toBe(20);
    expect(moyenne([])).toBeNull();
  });
});

describe('séries mensuelles', () => {
  it('liste les mois jusqu’au mois donné, janvier compris', () => {
    expect(derniersMois(4, new Date('2027-02-10T00:00:00Z'))).toEqual([
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
    ]);
  });

  it('garde les mois vides et ignore ce qui est hors fenêtre ou sans date', () => {
    const serie = serieParMois(
      ['2026-09', '2026-10', '2026-11'],
      [
        { d: new Date('2026-10-02T00:00:00Z'), v: 5 },
        { d: new Date('2026-10-30T00:00:00Z'), v: 7 },
        { d: new Date('2025-01-01T00:00:00Z'), v: 99 },
        { d: null, v: 50 },
      ],
      (l) => l.d,
      (l) => l.v,
    );
    expect(serie).toEqual([
      { periode: '2026-09', valeur: 0 },
      { periode: '2026-10', valeur: 12 },
      { periode: '2026-11', valeur: 0 },
    ]);
  });
});

describe('classement', () => {
  it('trie par valeur décroissante, avec le même rang à égalité, et limite à n', () => {
    const noms = classer(
      [
        { nom: 'A', v: 10 },
        { nom: 'B', v: 30 },
        { nom: 'C', v: 30 },
        { nom: 'D', v: 5 },
      ],
      (e) => e.v,
      3,
    );
    expect(noms.map((c) => [c.rang, c.element.nom])).toEqual([
      [1, 'B'],
      [1, 'C'],
      [3, 'A'],
    ]);
  });
});

describe('mise en forme des rapports', () => {
  it('écrit nombres, montants, pourcentages et dates à la française', () => {
    expect(formaterNombre(1250000)).toBe('1\u00a0250\u00a0000');
    expect(formaterMontant(2500)).toBe('2\u00a0500\u00a0FCFA');
    expect(formaterPourcentage(12.5)).toBe('12,5\u00a0%');
    expect(formaterDate('2026-10-05T10:00:00Z')).toBe('05/10/2026');
    expect(formaterDate('pas une date')).toBe('');
  });

  it('formate une cellule selon son type, vide pour null', () => {
    expect(texteCellule(1500000, 'montant')).toBe('1\u00a0500\u00a0000');
    expect(texteCellule(42, 'nombre')).toBe('42');
    expect(texteCellule(33.3, 'pourcentage')).toBe('33,3\u00a0%');
    expect(texteCellule('2026-10-05', 'date')).toBe('05/10/2026');
    expect(texteCellule('Libellé', 'texte')).toBe('Libellé');
    expect(texteCellule(null, 'montant')).toBe('');
    expect(texteCellule(undefined, 'texte')).toBe('');
  });

  it('fabrique un nom de fichier sans accent ni espace', () => {
    expect(nomFichier('Ventes par période', '2026-10-01', '2026-10-31')).toBe(
      'ventes-par-periode_2026-10-01_2026-10-31',
    );
    expect(nomFichier('Terrains : état', null, null)).toBe('terrains-etat');
  });
});
