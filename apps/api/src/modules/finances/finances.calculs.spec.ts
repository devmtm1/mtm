import {
  type LigneJournal,
  bornesMois,
  celluleCsv,
  honoraires,
  margeReconnue,
  moisCouverts,
  moisDe,
  nombreFrancais,
  periodeValide,
  serieMensuelle,
  totaliser,
  versCsv,
} from './finances.calculs';

function ligne(partiel: Partial<LigneJournal>): LigneJournal {
  return {
    id: 'l',
    date: new Date('2026-10-12T10:00:00Z'),
    activite: 'vente',
    sens: 'entree',
    nature: 'encaissement_vente',
    libelle: 'Paiement',
    tiers: null,
    reference: null,
    mode: null,
    montant: 100,
    revenu: 0,
    lien: null,
    ...partiel,
  };
}

describe('périodes', () => {
  it('donne le mois d’un instant en UTC', () => {
    expect(moisDe(new Date('2026-10-31T23:59:59Z'))).toBe('2026-10');
    expect(moisDe(new Date('2026-11-01T00:00:00Z'))).toBe('2026-11');
  });

  it('valide le format AAAA-MM', () => {
    expect(periodeValide('2026-10')).toBe(true);
    for (const mauvais of [
      '2026-13',
      '2026-00',
      '26-10',
      '2026-1',
      'octobre',
    ]) {
      expect(periodeValide(mauvais)).toBe(false);
    }
  });

  it('borne un mois du premier jour inclus au suivant exclu, décembre compris', () => {
    expect(bornesMois('2026-12')).toEqual({
      debut: new Date('2026-12-01T00:00:00Z'),
      fin: new Date('2027-01-01T00:00:00Z'),
    });
  });

  it('liste les mois couverts', () => {
    expect(
      moisCouverts(
        new Date('2026-11-15T00:00:00Z'),
        new Date('2027-02-01T00:00:00Z'),
      ),
    ).toEqual(['2026-11', '2026-12', '2027-01']);
  });
});

describe('revenu de MTM', () => {
  it('calcule les honoraires de gestion en pourcentage, arrondis au franc', () => {
    expect(honoraires(150_000, 10)).toBe(15_000);
    expect(honoraires(333_333, 7.5)).toBe(25_000);
    expect(honoraires(100_000, 0)).toBe(0);
  });

  it('reconnaît la marge au prorata de ce qui est payé', () => {
    expect(margeReconnue(2_000_000, 5_000_000, 10_000_000)).toBe(1_000_000);
    expect(margeReconnue(2_000_000, 10_000_000, 10_000_000)).toBe(2_000_000);
  });

  it('la somme des parts retombe sur la marge quand la vente est soldée', () => {
    const paiements = [3_000_000, 3_000_000, 4_000_000];
    const total = paiements.reduce(
      (somme, p) => somme + margeReconnue(1_500_000, p, 10_000_000),
      0,
    );
    expect(total).toBe(1_500_000);
  });

  it('ne reconnaît rien sans marge connue, sans prix ou sans paiement', () => {
    expect(margeReconnue(null, 100, 1000)).toBe(0);
    expect(margeReconnue(500, 100, 0)).toBe(0);
    expect(margeReconnue(500, 0, 1000)).toBe(0);
  });
});

describe('totaux', () => {
  const lignes = [
    ligne({ montant: 1000, revenu: 200 }),
    ligne({ activite: 'locatif', nature: 'loyer', montant: 500, revenu: 50 }),
    ligne({ sens: 'sortie', nature: 'commission_commercial', montant: 120 }),
    ligne({
      activite: 'general',
      sens: 'sortie',
      nature: 'operation_depense',
      montant: 80,
    }),
  ];

  it('sépare encaissements, revenu, dépenses et résultat, par activité et au global', () => {
    const { global, parActivite } = totaliser(lignes);
    expect(global).toEqual({
      encaissements: 1500,
      revenu: 250,
      depenses: 200,
      resultat: 50,
    });
    expect(parActivite.vente).toEqual({
      encaissements: 1000,
      revenu: 200,
      depenses: 120,
      resultat: 80,
    });
    expect(parActivite.locatif.resultat).toBe(50);
    expect(parActivite.general.resultat).toBe(-80);
    expect(parActivite.construction).toEqual({
      encaissements: 0,
      revenu: 0,
      depenses: 0,
      resultat: 0,
    });
  });

  it('le global est la somme des activités', () => {
    const { global, parActivite } = totaliser(lignes);
    const somme = Object.values(parActivite).reduce(
      (s, a) => s + a.resultat,
      0,
    );
    expect(somme).toBe(global.resultat);
  });

  it('une série mensuelle garde les mois sans mouvement', () => {
    const serie = serieMensuelle(
      [
        ligne({
          date: new Date('2026-10-05T00:00:00Z'),
          montant: 10,
          revenu: 4,
        }),
      ],
      new Date('2026-09-01T00:00:00Z'),
      new Date('2026-12-01T00:00:00Z'),
    );
    expect(serie.map((p) => p.periode)).toEqual([
      '2026-09',
      '2026-10',
      '2026-11',
    ]);
    expect(serie[1]).toEqual({
      periode: '2026-10',
      encaissements: 10,
      revenu: 4,
      depenses: 0,
    });
    expect(serie[0].encaissements).toBe(0);
  });
});

describe('export CSV', () => {
  it('écrit les nombres à la française', () => {
    expect(nombreFrancais(1234.5)).toBe('1234,5');
    expect(nombreFrancais(2000000)).toBe('2000000');
  });

  it('protège les séparateurs, les guillemets et les formules', () => {
    expect(celluleCsv('Vente; lot 4')).toBe('"Vente; lot 4"');
    expect(celluleCsv('Il dit "oui"')).toBe('"Il dit ""oui"""');
    expect(celluleCsv('=SOMME(A1:A9)')).toBe("'=SOMME(A1:A9)");
    expect(celluleCsv('+221771234567')).toBe("'+221771234567");
    expect(celluleCsv('Simple')).toBe('Simple');
  });

  it('produit un CSV UTF-8 avec BOM, en-têtes et une ligne par mouvement', () => {
    const csv = versCsv([
      ligne({
        libelle: 'Loyer octobre',
        activite: 'locatif',
        nature: 'loyer',
        montant: 150000,
        revenu: 15000,
        tiers: 'Awa Sy',
      }),
      ligne({
        sens: 'sortie',
        nature: 'operation_depense',
        activite: 'general',
        libelle: 'Électricité',
        montant: 42500,
      }),
    ]).toString('utf8');
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lignes = csv.slice(1).trimEnd().split('\r\n');
    expect(lignes[0]).toBe(
      'Date;Activité;Nature;Libellé;Tiers;Référence;Mode;Entrée;Sortie;Revenu MTM',
    );
    expect(lignes[1]).toBe(
      '2026-10-12;Gestion locative;Loyer encaissé;Loyer octobre;Awa Sy;;;150000;;15000',
    );
    expect(lignes[2]).toBe(
      '2026-10-12;Général (hors activité);Dépense saisie;Électricité;;;;;42500;',
    );
  });
});
