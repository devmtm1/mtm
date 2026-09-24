import { createPrismaMock } from '../../../test/helpers/prisma-mock';
import {
  completerEcheances,
  deriveEcheanceStatut,
  genererEcheances,
  imputerPaiementSurEcheances,
  rafraichirStatutsEcheances,
} from './echeance-loyer.helper';

describe('deriveEcheanceStatut', () => {
  const maintenant = new Date('2026-10-15T00:00:00Z');

  it('est « à venir » sans paiement et avant échéance', () => {
    const dateEcheance = new Date('2026-11-05T00:00:00Z');
    expect(deriveEcheanceStatut(100000, 0, dateEcheance, maintenant)).toBe(
      'a_venir',
    );
  });

  it('est « impayée » sans paiement et après échéance', () => {
    const dateEcheance = new Date('2026-09-05T00:00:00Z');
    expect(deriveEcheanceStatut(100000, 0, dateEcheance, maintenant)).toBe(
      'impayee',
    );
  });

  it('est « partielle » avec un paiement partiel avant échéance', () => {
    const dateEcheance = new Date('2026-11-05T00:00:00Z');
    expect(deriveEcheanceStatut(100000, 40000, dateEcheance, maintenant)).toBe(
      'partielle',
    );
  });

  it('est « en retard » avec un paiement partiel après échéance', () => {
    const dateEcheance = new Date('2026-09-05T00:00:00Z');
    expect(deriveEcheanceStatut(100000, 40000, dateEcheance, maintenant)).toBe(
      'en_retard',
    );
  });

  it('est « payée » dès que le montant prévu est atteint, même en retard', () => {
    const dateEcheance = new Date('2026-09-05T00:00:00Z');
    expect(deriveEcheanceStatut(100000, 100000, dateEcheance, maintenant)).toBe(
      'payee',
    );
    // Un léger trop-perçu reste « payée », pas une nouvelle catégorie.
    expect(deriveEcheanceStatut(100000, 105000, dateEcheance, maintenant)).toBe(
      'payee',
    );
  });
});

describe('genererEcheances', () => {
  let prismaMock: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    prismaMock.echeanceLoyer.findFirst.mockResolvedValue(null);
    prismaMock.echeanceLoyer.createMany.mockResolvedValue({ count: 0 });
  });

  it('ne place jamais la première échéance avant l’entrée dans les lieux', async () => {
    await genererEcheances(
      prismaMock as never,
      {
        bailLocatifId: 'bail-1',
        loyerMensuel: 150000,
        jourEcheance: 5,
        dateDebut: new Date('2026-10-20T00:00:00Z'),
        dateFin: null,
      },
      2,
    );

    const donnees = prismaMock.echeanceLoyer.createMany.mock.calls[0][0]
      .data as { periode: Date; dateEcheance: Date }[];
    // Bail signé le 20 avec un loyer dû le 5 : sans ce recalage, octobre
    // serait créé déjà impayé pour un mois pas encore occupé.
    expect(donnees[0].dateEcheance.toISOString()).toBe(
      '2026-10-20T00:00:00.000Z',
    );
    // Les mois suivants reprennent le jour convenu.
    expect(donnees[1].dateEcheance.toISOString()).toBe(
      '2026-11-05T00:00:00.000Z',
    );
  });

  it('s’arrête à la date de fin du bail', async () => {
    await genererEcheances(
      prismaMock as never,
      {
        bailLocatifId: 'bail-1',
        loyerMensuel: 100000,
        jourEcheance: 5,
        dateDebut: new Date('2026-10-01T00:00:00Z'),
        dateFin: new Date('2026-12-31T00:00:00Z'),
      },
      12,
    );
    const donnees = prismaMock.echeanceLoyer.createMany.mock.calls[0][0]
      .data as unknown[];
    expect(donnees).toHaveLength(3);
  });
});

describe('completerEcheances', () => {
  it('prolonge un bail dont le lot initial de douze mois est épuisé', async () => {
    const prismaMock = createPrismaMock();
    // Dernière échéance connue : septembre 2027, alors qu'on est en août 2027.
    prismaMock.echeanceLoyer.findFirst.mockResolvedValue({
      periode: new Date('2027-09-01T00:00:00Z'),
    });
    prismaMock.echeanceLoyer.createMany.mockResolvedValue({ count: 2 });

    const generees = await completerEcheances(
      prismaMock as never,
      {
        bailLocatifId: 'bail-1',
        loyerMensuel: 100000,
        jourEcheance: 5,
        dateDebut: new Date('2026-10-01T00:00:00Z'),
        dateFin: null,
      },
      3,
      new Date('2027-08-20T00:00:00Z'),
    );

    expect(generees).toBe(2);
    const donnees = prismaMock.echeanceLoyer.createMany.mock.calls[0][0]
      .data as { periode: Date }[];
    // En août, avec trois mois d'avance demandés, le bail doit couvrir
    // septembre (déjà là), octobre et novembre.
    expect(donnees.map((ligne) => ligne.periode.toISOString())).toEqual([
      '2027-10-01T00:00:00.000Z',
      '2027-11-01T00:00:00.000Z',
    ]);
  });
});

describe('imputerPaiementSurEcheances', () => {
  it('renvoie ce qui n’a pas pu être imputé au lieu de le perdre', async () => {
    const prismaMock = createPrismaMock();
    prismaMock.echeanceLoyer.findMany.mockResolvedValue([
      {
        id: 'ech-1',
        montantPrevu: 100000,
        montantPaye: 0,
        dateEcheance: new Date('2026-10-05T00:00:00Z'),
        statut: 'impayee',
      },
    ]);
    prismaMock.echeanceLoyer.update.mockResolvedValue({});

    const restant = await imputerPaiementSurEcheances(
      prismaMock as never,
      'bail-1',
      250000,
    );

    expect(restant).toBe(150000);
  });
});

describe('rafraichirStatutsEcheances', () => {
  it('recale une échéance restée « à venir » après son terme', async () => {
    const prismaMock = createPrismaMock();
    prismaMock.echeanceLoyer.findMany.mockResolvedValue([
      {
        id: 'ech-1',
        montantPrevu: 100000,
        montantPaye: 0,
        dateEcheance: new Date('2026-09-05T00:00:00Z'),
        statut: 'a_venir',
      },
    ]);
    prismaMock.echeanceLoyer.update.mockResolvedValue({});

    const recales = await rafraichirStatutsEcheances(
      prismaMock as never,
      ['bail-1'],
      new Date('2026-10-15T00:00:00Z'),
    );

    expect(recales).toBe(1);
    expect(prismaMock.echeanceLoyer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { statut: 'impayee' } }),
    );
  });
});
