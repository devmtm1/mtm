import {
  appariementAutomatique,
  candidats,
  empreintes,
  lireDate,
  lireMontant,
  lireReleveCsv,
  type EvenementRapprochable,
} from './rapprochement.calculs';

const jour = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function evenement(
  partiel: Partial<EvenementRapprochable>,
): EvenementRapprochable {
  return {
    id: 'e',
    date: jour('2026-10-10'),
    numero: 'OP-2026-000001',
    libelle: 'Paiement',
    tiers: null,
    reference: null,
    entree: 0,
    sortie: 0,
    ...partiel,
  };
}

describe('lecture des montants', () => {
  it.each([
    ['1 250 000', 1_250_000],
    ['1 250 000,50', 1_250_001],
    ['1.250.000', 1_250_000],
    ['1,250,000.40', 1_250_000],
    ['-15000', -15_000],
    ['(15 000)', -15_000],
    ['+2500 FCFA', 2_500],
    ['12.5', 13],
  ])('« %s » vaut %i', (brut, attendu) => {
    expect(lireMontant(brut)).toBe(attendu);
  });

  it('refuse ce qui n’est pas un montant', () => {
    expect(lireMontant('abc')).toBeNull();
    expect(lireMontant('')).toBeNull();
    expect(lireMontant(undefined)).toBeNull();
  });
});

describe('lecture des dates', () => {
  it('accepte les formats usuels et refuse les dates impossibles', () => {
    expect(lireDate('2026-10-19')).toEqual(jour('2026-10-19'));
    expect(lireDate('19/10/2026')).toEqual(jour('2026-10-19'));
    expect(lireDate('19-10-26')).toEqual(jour('2026-10-19'));
    expect(lireDate('31/02/2026')).toBeNull();
    expect(lireDate('hier')).toBeNull();
  });
});

describe('relevé CSV', () => {
  it('lit un relevé à montant signé, séparé par des points-virgules', () => {
    const { lignes, erreurs } = lireReleveCsv(
      'Date;Libellé;Référence;Montant\n19/10/2026;Virement client;VIR-1;1 500 000\n20/10/2026;Frais bancaires;;-2 500\n',
    );
    expect(erreurs).toEqual([]);
    expect(lignes).toHaveLength(2);
    expect(lignes[0]).toMatchObject({
      libelle: 'Virement client',
      reference: 'VIR-1',
      montant: 1_500_000,
    });
    expect(lignes[1]).toMatchObject({ reference: null, montant: -2_500 });
  });

  it('lit un relevé à colonnes débit et crédit, avec BOM et guillemets', () => {
    const { lignes } = lireReleveCsv(
      '﻿date,description,débit,crédit\n2026-10-19,"Achat, ciment",50000,\n2026-10-20,Dépôt,,100000\n',
    );
    expect(lignes.map((l) => l.montant)).toEqual([-50_000, 100_000]);
    expect(lignes[0].libelle).toBe('Achat, ciment');
  });

  it('signale les lignes illisibles sans les perdre en silence', () => {
    const { lignes, erreurs } = lireReleveCsv(
      'date;libelle;montant\n19/10/2026;ok;1000\nnimporte quoi;x;5\n20/10/2026;sans montant;\n',
    );
    expect(lignes).toHaveLength(1);
    expect(erreurs.map((e) => e.ligne)).toEqual([3, 4]);
  });

  it('refuse un en-tête sans date ou sans montant', () => {
    const { lignes, erreurs } = lireReleveCsv('nom;prenom\na;b\n');
    expect(lignes).toEqual([]);
    expect(erreurs[0].message).toContain('En-tête');
    expect(lireReleveCsv('').erreurs[0].message).toContain('vide');
  });
});

describe('empreintes', () => {
  it('sont stables, et distinguent deux lignes identiques du même fichier', () => {
    const ligne = {
      date: jour('2026-10-19'),
      libelle: 'Frais',
      reference: null,
      montant: -500,
    };
    const premiere = empreintes([ligne, ligne, { ...ligne, montant: -600 }]);
    expect(new Set(premiere).size).toBe(3);
    expect(empreintes([ligne, ligne, { ...ligne, montant: -600 }])).toEqual(
      premiere,
    );
  });
});

describe('candidats et appariement', () => {
  const evenements = [
    evenement({
      id: 'a',
      entree: 1_000_000,
      date: jour('2026-10-10'),
      reference: 'VIR-77',
    }),
    evenement({ id: 'b', entree: 1_000_000, date: jour('2026-10-12') }),
    evenement({ id: 'c', sortie: 25_000, date: jour('2026-10-11') }),
    evenement({ id: 'd', entree: 1_000_000, date: jour('2026-09-01') }),
  ];

  it('retient même sens, même montant et une date proche, la référence commune en tête', () => {
    const liste = candidats(
      {
        date: jour('2026-10-11'),
        libelle: 'Virement',
        reference: 'VIR-77',
        montant: 1_000_000,
      },
      evenements,
      new Set(),
    );
    expect(liste.map((c) => c.evenement.id)).toEqual(['a', 'b']);
    expect(liste[0].referenceCommune).toBe(true);
    // Une sortie ne se rapproche pas d'une entrée de même montant.
    expect(
      candidats(
        {
          date: jour('2026-10-11'),
          libelle: 'x',
          reference: null,
          montant: -1_000_000,
        },
        evenements,
        new Set(),
      ),
    ).toEqual([]);
  });

  it('ne propose pas un mouvement déjà rapproché', () => {
    const liste = candidats(
      {
        date: jour('2026-10-11'),
        libelle: 'x',
        reference: null,
        montant: 1_000_000,
      },
      evenements,
      new Set(['a']),
    );
    expect(liste.map((c) => c.evenement.id)).toEqual(['b']);
  });

  it('apparie seulement sans ambiguïté', () => {
    const paires = appariementAutomatique(
      [
        // Un seul candidat : apparié.
        {
          id: 'l1',
          date: jour('2026-10-11'),
          libelle: 'Frais',
          reference: null,
          montant: -25_000,
        },
        // Deux candidats, dont un seul avec la bonne référence : apparié sur la référence.
        {
          id: 'l2',
          date: jour('2026-10-11'),
          libelle: 'Virement',
          reference: 'VIR-77',
          montant: 1_000_000,
        },
        // Deux candidats sans référence : laissé à la main.
        {
          id: 'l3',
          date: jour('2026-10-11'),
          libelle: 'Virement',
          reference: null,
          montant: 1_000_000,
        },
      ],
      evenements,
      new Set(),
    );
    expect(paires).toEqual([
      { ligneId: 'l1', evenementId: 'c' },
      { ligneId: 'l2', evenementId: 'a' },
    ]);
  });
});
