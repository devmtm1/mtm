import {
  jourUtc,
  montantSejour,
  nombreNuits,
  seChevauchent,
  syntheseSejour,
  verifierDemandeSejour,
} from './sejour.helper';
import {
  comparerEtats,
  compterDegradations,
  lirePieces,
} from './etat-des-lieux.helper';

const jour = (texte: string) => jourUtc(texte);

describe('séjour — nuits et prix', () => {
  it('compte les nuits entre l’arrivée et le départ', () => {
    expect(nombreNuits(jour('2026-10-15'), jour('2026-10-18'))).toBe(3);
    expect(nombreNuits(jour('2026-10-30'), jour('2026-11-02'))).toBe(3);
    expect(nombreNuits(jour('2026-10-15'), jour('2026-10-15'))).toBe(0);
  });

  it('calcule le total : nuits × prix + ménage − remise', () => {
    expect(
      montantSejour({ nuits: 3, prixNuit: 45000, fraisMenage: 10000 }),
    ).toBe(145000);
    expect(
      montantSejour({
        nuits: 3,
        prixNuit: 45000,
        fraisMenage: 10000,
        remise: 15000,
      }),
    ).toBe(130000);
    expect(montantSejour({ nuits: 1, prixNuit: 10000, remise: 50000 })).toBe(0);
  });
});

describe('séjour — chevauchement', () => {
  const periode = (arrivee: string, depart: string) => ({
    arrivee: jour(arrivee),
    depart: jour(depart),
  });

  it('détecte deux séjours qui se recouvrent', () => {
    expect(
      seChevauchent(
        periode('2026-10-15', '2026-10-18'),
        periode('2026-10-17', '2026-10-20'),
      ),
    ).toBe(true);
    expect(
      seChevauchent(
        periode('2026-10-15', '2026-10-18'),
        periode('2026-10-16', '2026-10-17'),
      ),
    ).toBe(true);
  });

  it('accepte un départ et une arrivée le même jour', () => {
    expect(
      seChevauchent(
        periode('2026-10-15', '2026-10-18'),
        periode('2026-10-18', '2026-10-20'),
      ),
    ).toBe(false);
    expect(
      seChevauchent(
        periode('2026-10-12', '2026-10-15'),
        periode('2026-10-15', '2026-10-18'),
      ),
    ).toBe(false);
  });

  it('ignore les séjours éloignés', () => {
    expect(
      seChevauchent(
        periode('2026-10-01', '2026-10-05'),
        periode('2026-11-01', '2026-11-05'),
      ),
    ).toBe(false);
  });
});

describe('séjour — règlement', () => {
  it('distingue non réglé, acompte, soldé et trop-perçu', () => {
    expect(syntheseSejour(145000, [])).toMatchObject({
      statut: 'non_regle',
      reste: 145000,
    });
    expect(syntheseSejour(145000, [{ montant: 50000 }])).toMatchObject({
      statut: 'acompte',
      reste: 95000,
      totalRegle: 50000,
    });
    expect(
      syntheseSejour(145000, [{ montant: 50000 }, { montant: 95000 }]),
    ).toMatchObject({ statut: 'solde', reste: 0 });
    expect(syntheseSejour(100000, [{ montant: 120000 }])).toMatchObject({
      statut: 'trop_percu',
      excedent: 20000,
      reste: 0,
    });
  });
});

describe('séjour — règles de la demande', () => {
  const bien = { nuitsMinimum: 2, capaciteVoyageurs: 4 };
  const aujourdhui = new Date('2026-10-12T10:00:00Z');
  const demande = (arrivee: string, depart: string, voyageurs = 2) => ({
    arrivee: jour(arrivee),
    depart: jour(depart),
    voyageurs,
  });
  const verifier = (
    d: ReturnType<typeof demande>,
    options: { autoriserPasse?: boolean } = {},
  ) => verifierDemandeSejour(bien, d, { aujourdhui, ...options });

  it('accepte une demande conforme', () => {
    expect(verifier(demande('2026-10-15', '2026-10-18'))).toBeNull();
    // Arriver aujourd'hui est permis.
    expect(verifier(demande('2026-10-12', '2026-10-14'))).toBeNull();
  });

  it('refuse un départ avant l’arrivée, une durée trop courte ou trop longue', () => {
    expect(verifier(demande('2026-10-18', '2026-10-15'))).toMatch(/après/);
    expect(verifier(demande('2026-10-15', '2026-10-16'))).toMatch(
      /2 nuits minimum/,
    );
    expect(verifier(demande('2026-10-15', '2027-03-01'))).toMatch(
      /longue durée/,
    );
  });

  it('MTM peut saisir un séjour déjà commencé, pas le site', () => {
    const passe = demande('2026-10-10', '2026-10-14');
    expect(verifier(passe, { autoriserPasse: true })).toBeNull();
    expect(verifier(passe)).toMatch(/déjà passée/);
  });

  it('refuse un trop grand groupe', () => {
    expect(verifier(demande('2026-10-15', '2026-10-18', 6))).toMatch(
      /4 personnes au plus/,
    );
  });
});

describe('état des lieux — comparaison entrée / sortie', () => {
  const entree = [
    { piece: 'Salon', etat: 'bon' as const },
    { piece: 'Cuisine', etat: 'bon' as const },
    { piece: 'Chambre 1', etat: 'usage' as const },
  ];

  it('repère les pièces dégradées, sans tenir compte de la casse', () => {
    const comparaison = comparerEtats(entree, [
      { piece: 'salon', etat: 'degrade', observation: 'Tache sur le canapé' },
      { piece: 'Cuisine', etat: 'bon' },
      { piece: 'Chambre 1', etat: 'usage' },
    ]);
    expect(comparaison.find((ligne) => ligne.piece === 'salon')).toMatchObject({
      avant: 'bon',
      apres: 'degrade',
      degradation: true,
      observation: 'Tache sur le canapé',
    });
    expect(compterDegradations(comparaison)).toBe(1);
  });

  it('une pièce qui s’améliore ou reste égale n’est pas une dégradation', () => {
    const comparaison = comparerEtats(entree, [
      { piece: 'Chambre 1', etat: 'bon' },
      { piece: 'Cuisine', etat: 'bon' },
    ]);
    expect(compterDegradations(comparaison)).toBe(0);
  });

  it('une pièce absente de l’entrée n’est jamais reprochée', () => {
    const comparaison = comparerEtats(entree, [
      { piece: 'Terrasse', etat: 'hors_service' },
    ]);
    expect(comparaison[0]).toMatchObject({ avant: null, degradation: false });
  });

  it('lit la colonne JSON sans lui faire confiance', () => {
    expect(
      lirePieces([
        { piece: ' Salon ', etat: 'bon' },
        { piece: '', etat: 'bon' },
        { piece: 'WC', etat: 'inconnu' },
        'texte',
        null,
        { piece: 'Cuisine', etat: 'degrade', observation: 'Plaque cassée' },
      ]),
    ).toEqual([
      { piece: 'Salon', etat: 'bon', observation: null },
      { piece: 'Cuisine', etat: 'degrade', observation: 'Plaque cassée' },
    ]);
    expect(lirePieces('pas un tableau')).toEqual([]);
  });
});
