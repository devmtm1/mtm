import type { LigneJournal } from './finances.calculs';
import {
  SEUILS_DEFAUT,
  ajouterMois,
  calculRemboursement,
  commissionReconnue,
  compteDuMode,
  ecartCaisse,
  ficheChantier,
  fluxParCompte,
  lireReglesDesistement,
  lireSeuils,
  niveauValidation,
  normaliserMode,
  numeroOperation,
  peutAutoriser,
  situationProprietaire,
  soldeTheorique,
} from './tresorerie.calculs';

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
    mode: 'especes',
    montant: 100,
    revenu: 0,
    lien: null,
    ...partiel,
  };
}

describe('seuils de validation des dépenses', () => {
  it.each([
    [1, 0],
    [50_000, 0],
    [50_001, 1],
    [200_000, 1],
    [200_001, 2],
    [500_000, 2],
    [500_001, 3],
  ])('%i FCFA demande le niveau %i', (montant, niveau) => {
    expect(niveauValidation(montant)).toBe(niveau);
  });

  it('suit des seuils réglés par la Direction', () => {
    const seuils = { palier1: 10_000, palier2: 20_000, palier3: 30_000 };
    expect(niveauValidation(15_000, seuils)).toBe(1);
    expect(niveauValidation(30_001, seuils)).toBe(3);
  });

  it('retombe sur les seuils validés quand le réglage est incohérent', () => {
    expect(lireSeuils({ palier1: 100, palier2: 50, palier3: 10 })).toEqual(
      SEUILS_DEFAUT,
    );
    expect(lireSeuils(null)).toEqual(SEUILS_DEFAUT);
  });

  it('autorise par le droit ou par une délégation plafonnée', () => {
    expect(peutAutoriser(['finances:autoriser'], {}, 'u1', 900_000)).toBe(true);
    expect(peutAutoriser([], { u2: 150_000 }, 'u2', 100_000)).toBe(true);
    expect(peutAutoriser([], { u2: 150_000 }, 'u2', 150_001)).toBe(false);
    expect(peutAutoriser([], {}, 'u3', 10)).toBe(false);
  });
});

describe('numéro d’opération', () => {
  it('est lisible et unique par séquence', () => {
    expect(numeroOperation('OP', new Date('2026-10-19T08:00:00Z'), 123)).toBe(
      'OP-2026-000123',
    );
  });
});

describe('comptes de trésorerie', () => {
  const comptes = [
    { id: 'caisse', modes: ['especes'] },
    { id: 'wave', modes: ['wave', 'mobile_money'] },
    { id: 'om', modes: ['orange_money'] },
    { id: 'banque', modes: ['virement', 'cheque'] },
  ];

  it('rattache un mode de paiement à son compte, sans tenir compte des accents ni de la casse', () => {
    expect(normaliserMode(' Orange Money ')).toBe('orange_money');
    expect(normaliserMode('Espèces')).toBe('especes');
    expect(compteDuMode('Espèces', comptes)).toBe('caisse');
    expect(compteDuMode('orange-money', comptes)).toBe('om');
    expect(compteDuMode('mobile_money', comptes)).toBe('wave');
    expect(compteDuMode('troc', comptes)).toBeNull();
    expect(compteDuMode(null, comptes)).toBeNull();
  });

  it('ignore un compte inactif', () => {
    expect(
      compteDuMode('especes', [{ id: 'c', modes: ['especes'], actif: false }]),
    ).toBeNull();
  });

  it('calcule le flux d’un compte, transferts compris, et isole ce qui n’a pas de compte', () => {
    const du = new Date('2026-10-01T00:00:00Z');
    const au = new Date('2026-11-01T00:00:00Z');
    const { parCompte, sansCompte } = fluxParCompte(
      [
        ligne({ montant: 1_000, mode: 'especes' }),
        ligne({ montant: 300, sens: 'sortie', mode: 'especes' }),
        ligne({ montant: 500, mode: 'virement' }),
        ligne({ montant: 70, mode: 'troc' }),
        ligne({ montant: 40, mode: 'especes', compteId: 'wave' }),
        ligne({ montant: 9_999, date: new Date('2026-09-30T23:00:00Z') }),
      ],
      [
        {
          compteSourceId: 'banque',
          compteDestinationId: 'caisse',
          montant: 200,
          date: new Date('2026-10-05T00:00:00Z'),
        },
      ],
      comptes,
      du,
      au,
    );
    expect(parCompte.get('caisse')).toEqual({ entrees: 1_200, sorties: 300 });
    expect(parCompte.get('banque')).toEqual({ entrees: 500, sorties: 200 });
    expect(parCompte.get('wave')).toEqual({ entrees: 40, sorties: 0 });
    expect(sansCompte).toEqual({ entrees: 70, sorties: 0 });
  });

  it('donne le solde théorique et l’écart de caisse', () => {
    const theorique = soldeTheorique(10_000, {
      entrees: 5_000,
      sorties: 2_000,
    });
    expect(theorique).toBe(13_000);
    expect(ecartCaisse(12_500, theorique)).toBe(-500);
    expect(ecartCaisse(13_000, theorique)).toBe(0);
  });
});

describe('terrain confié : commission, dû au propriétaire', () => {
  // L'exemple du cahier des charges : 3 500 000 au client, 3 000 000 au propriétaire, 500 000 à MTM.
  const base = {
    prixVente: 3_500_000,
    commission: 500_000,
    reverse: 0,
    enCours: 0,
    mode: 'au_fur_et_a_mesure',
  };

  it('retrouve l’exemple du cahier des charges', () => {
    const s = situationProprietaire({ ...base, encaisse: 3_500_000 });
    expect(s.du).toBe(3_000_000);
    expect(s.commissionAcquise).toBe(500_000);
    expect(s.partProprietaire).toBe(3_000_000);
    expect(s.solde).toBe(true);
  });

  it('au fur et à mesure : le reversement suit l’encaissé', () => {
    const s = situationProprietaire({ ...base, encaisse: 1_750_000 });
    expect(s.commissionAcquise).toBe(250_000);
    expect(s.exigible).toBe(1_500_000);
    expect(s.disponibleSansAvance).toBe(1_500_000);
    expect(s.disponibleAvecAvance).toBe(3_000_000);
  });

  it('à la fin du paiement : rien n’est exigible avant le solde', () => {
    const avant = situationProprietaire({
      ...base,
      mode: 'fin_paiement',
      encaisse: 3_000_000,
    });
    expect(avant.exigible).toBe(0);
    expect(avant.disponibleSansAvance).toBe(0);
    const apres = situationProprietaire({
      ...base,
      mode: 'fin_paiement',
      encaisse: 3_500_000,
    });
    expect(apres.exigible).toBe(3_000_000);
  });

  it('déduit ce qui est déjà reversé ou en cours', () => {
    const s = situationProprietaire({
      ...base,
      encaisse: 3_500_000,
      reverse: 2_000_000,
      enCours: 500_000,
    });
    expect(s.soldeRestant).toBe(1_000_000);
    expect(s.disponibleSansAvance).toBe(500_000);
  });

  it('ne laisse jamais la commission dépasser le prix', () => {
    const s = situationProprietaire({
      ...base,
      commission: 9_000_000,
      encaisse: 1_000_000,
    });
    expect(s.commission).toBe(3_500_000);
    expect(s.du).toBe(0);
  });

  it('reconnaît la commission au prorata d’un paiement', () => {
    expect(commissionReconnue(500_000, 1_750_000, 3_500_000)).toBe(250_000);
    expect(commissionReconnue(0, 1_000, 3_500_000)).toBe(0);
    expect(commissionReconnue(500_000, 1_000, 0)).toBe(0);
  });
});

describe('désistement et remboursement', () => {
  it('retient la moitié de l’avance et rembourse le reste', () => {
    expect(calculRemboursement(1_000_000, 1_000_000, 50)).toEqual({
      retenu: 500_000,
      rembourse: 500_000,
    });
  });

  it('ne retient que sur l’avance : les versements suivants sont rendus en entier', () => {
    expect(calculRemboursement(3_000_000, 1_000_000, 50)).toEqual({
      retenu: 500_000,
      rembourse: 2_500_000,
    });
  });

  it('ne retient jamais plus que ce qui a été versé', () => {
    expect(calculRemboursement(200_000, 1_000_000, 50)).toEqual({
      retenu: 100_000,
      rembourse: 100_000,
    });
  });

  it('lit les règles avec des valeurs de repli', () => {
    expect(lireReglesDesistement(undefined)).toMatchObject({
      retenuePct: 50,
      delaiMois: 6,
      validee: false,
    });
    expect(
      lireReglesDesistement({
        retenuePct: 30,
        delaiMois: 3,
        validee: true,
        version: ' v2 ',
      }),
    ).toEqual({ retenuePct: 30, delaiMois: 3, validee: true, version: 'v2' });
    expect(lireReglesDesistement({ retenuePct: 150 }).retenuePct).toBe(50);
  });

  it('ajoute des mois sans déborder', () => {
    expect(ajouterMois(new Date('2026-08-31T00:00:00Z'), 6)).toEqual(
      new Date('2027-02-28T00:00:00Z'),
    );
    expect(ajouterMois(new Date('2026-10-19T00:00:00Z'), 6)).toEqual(
      new Date('2027-04-19T00:00:00Z'),
    );
  });
});

describe('fiche financière d’un chantier', () => {
  const base = {
    prixTotal: 10_000_000,
    budgetPrevu: 8_000_000,
    avancement: 50,
    recettesConfirmees: 5_000_000,
    recettesEnAttente: 0,
    coutReel: 3_000_000,
    achatsClient: 0,
  };

  it('sépare marge prévisionnelle et marge réelle', () => {
    const f = ficheChantier(base);
    expect(f.margePrevisionnelle).toBe(2_000_000);
    expect(f.margeReelle).toBe(2_000_000);
    expect(f.resteACollecter).toBe(5_000_000);
  });

  it('projette le coût final sur l’avancement quand il dépasse le budget', () => {
    const f = ficheChantier({ ...base, coutReel: 5_000_000 });
    // 5 M dépensés à 50 % d'avancement : 10 M attendus, plus que les 8 M prévus.
    expect(f.coutFinalEstime).toBe(10_000_000);
    expect(f.resteAEngager).toBe(5_000_000);
    expect(f.resultatEstime).toBe(0);
    expect(f.depassementBudget).toBe(false);
  });

  it('signale un dépassement de budget', () => {
    expect(
      ficheChantier({ ...base, coutReel: 8_500_000 }).depassementBudget,
    ).toBe(true);
  });

  it('ne projette pas sur un chantier à peine commencé', () => {
    const f = ficheChantier({ ...base, avancement: 5, coutReel: 1_000_000 });
    expect(f.coutFinalEstime).toBe(8_000_000);
  });
});
