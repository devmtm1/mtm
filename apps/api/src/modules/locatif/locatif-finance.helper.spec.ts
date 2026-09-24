import { createPrismaMock } from '../../../test/helpers/prisma-mock';
import {
  calculerRegularisation,
  calculerSoldeBail,
  deriveCautionStatut,
  synchroniserSituationPaiement,
} from './locatif-finance.helper';

describe('deriveCautionStatut', () => {
  it('reste « non versée » tant que rien n’est encaissé', () => {
    expect(deriveCautionStatut(150000, 0, 0, 0)).toBe('non_versee');
  });

  it('distingue un versement partiel du versement complet', () => {
    expect(deriveCautionStatut(150000, 100000, 0, 0)).toBe(
      'partiellement_versee',
    );
    expect(deriveCautionStatut(150000, 150000, 0, 0)).toBe('versee');
  });

  it('suit la retenue totale, la retenue partielle et le remboursement', () => {
    expect(deriveCautionStatut(150000, 150000, 150000, 0)).toBe(
      'retenue_totale',
    );
    expect(deriveCautionStatut(150000, 150000, 50000, 100000)).toBe(
      'partiellement_retenue',
    );
    expect(deriveCautionStatut(150000, 150000, 0, 150000)).toBe('remboursee');
  });
});

describe('calculerSoldeBail', () => {
  it('ne compte que les encaissements validés et signale ceux en attente', async () => {
    const prismaMock = createPrismaMock();
    prismaMock.echeanceLoyer.findMany.mockResolvedValue([
      {
        montantPrevu: 100000,
        montantPaye: 100000,
        dateEcheance: new Date('2026-09-05T00:00:00Z'),
        statut: 'payee',
      },
      {
        montantPrevu: 100000,
        montantPaye: 0,
        dateEcheance: new Date('2026-10-05T00:00:00Z'),
        statut: 'impayee',
      },
    ]);
    prismaMock.paiementLoyer.aggregate.mockResolvedValue({
      _sum: { montant: 50000 },
    });

    const solde = await calculerSoldeBail(
      prismaMock as never,
      'bail-1',
      new Date('2026-10-20T00:00:00Z'),
    );

    expect(solde).toMatchObject({
      loyersDus: 200000,
      loyersEncaisses: 100000,
      solde: 100000,
      echeancesImpayees: 1,
      joursRetardMax: 15,
      encaissementsEnAttente: 50000,
    });
  });
});

describe('calculerRegularisation', () => {
  it('impute l’avance puis la caution, et propose le solde de sortie', async () => {
    const prismaMock = createPrismaMock();
    // Deux mois dus, un seul réglé : 100 000 restent à recouvrer.
    prismaMock.echeanceLoyer.findMany.mockResolvedValue([
      {
        montantPrevu: 100000,
        montantPaye: 100000,
        dateEcheance: new Date('2026-09-05T00:00:00Z'),
        statut: 'payee',
      },
      {
        montantPrevu: 100000,
        montantPaye: 0,
        dateEcheance: new Date('2026-10-05T00:00:00Z'),
        statut: 'impayee',
      },
    ]);
    prismaMock.paiementLoyer.aggregate.mockResolvedValue({
      _sum: { montant: 0 },
    });
    // 30 000 versés d'avance sur un mois postérieur à la sortie.
    prismaMock.echeanceLoyer.aggregate.mockResolvedValue({
      _sum: { montantPaye: 30000 },
    });
    prismaMock.mouvementCaution.findMany.mockResolvedValue([
      { type: 'versement', montant: 150000 },
    ]);

    const calcul = await calculerRegularisation(
      prismaMock as never,
      { id: 'bail-1', cautionMontant: 150000, dateSortieReelle: null },
      new Date('2026-10-31T00:00:00Z'),
      new Date('2026-11-05T00:00:00Z'),
    );

    expect(calcul.avanceReportee).toBe(30000);
    // 100 000 dus − 30 000 d'avance = 70 000 restants...
    expect(calcul.resteDu).toBe(70000);
    // ... couverts par la caution, dont le solde revient au locataire.
    expect(calcul.retenueCautionProposee).toBe(70000);
    expect(calcul.cautionARembourserProposee).toBe(80000);
    expect(calcul.montantPropose).toBe(0);
  });
});

describe('synchroniserSituationPaiement', () => {
  const echeanceImpayee = (jours: number) => [
    {
      montantPrevu: 100000,
      montantPaye: 0,
      dateEcheance: new Date(Date.now() - jours * 24 * 3600 * 1000),
      statut: 'impayee',
    },
  ];

  it('passe le bail en « impayé prolongé » au-delà du seuil paramétré', async () => {
    const prismaMock = createPrismaMock();
    prismaMock.echeanceLoyer.findMany.mockResolvedValue(echeanceImpayee(75));
    prismaMock.paiementLoyer.aggregate.mockResolvedValue({
      _sum: { montant: 0 },
    });
    prismaMock.bailLocatif.update.mockResolvedValue({});

    const situation = await synchroniserSituationPaiement(
      prismaMock as never,
      'bail-1',
      60,
    );

    expect(situation).toBe('impaye_prolonge');
    expect(prismaMock.bailLocatif.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { situationPaiement: 'impaye_prolonge' },
      }),
    );
  });

  it('reste en simple « retard » en deçà du seuil', async () => {
    const prismaMock = createPrismaMock();
    prismaMock.echeanceLoyer.findMany.mockResolvedValue(echeanceImpayee(10));
    prismaMock.paiementLoyer.aggregate.mockResolvedValue({
      _sum: { montant: 0 },
    });
    prismaMock.bailLocatif.update.mockResolvedValue({});

    expect(
      await synchroniserSituationPaiement(prismaMock as never, 'bail-1', 60),
    ).toBe('retard');
  });

  it('revient « à jour » quand plus rien n’est dû', async () => {
    const prismaMock = createPrismaMock();
    prismaMock.echeanceLoyer.findMany.mockResolvedValue([
      {
        montantPrevu: 100000,
        montantPaye: 100000,
        dateEcheance: new Date('2026-09-05T00:00:00Z'),
        statut: 'payee',
      },
    ]);
    prismaMock.paiementLoyer.aggregate.mockResolvedValue({
      _sum: { montant: 0 },
    });
    prismaMock.bailLocatif.update.mockResolvedValue({});

    expect(
      await synchroniserSituationPaiement(prismaMock as never, 'bail-1', 60),
    ).toBe('a_jour');
  });
});
