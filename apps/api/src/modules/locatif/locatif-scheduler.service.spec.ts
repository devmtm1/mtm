import { createLocatifTestContext } from './locatif.test-support';

describe('LocatifSchedulerService', () => {
  let prismaMock: ReturnType<typeof createLocatifTestContext>['prismaMock'];
  let scheduler: ReturnType<typeof createLocatifTestContext>['scheduler'];

  beforeEach(() => {
    ({ prismaMock, scheduler } = createLocatifTestContext());
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);
    prismaMock.bailLocatif.update.mockResolvedValue({});
    prismaMock.relanceLoyer.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.paiementLoyer.aggregate.mockResolvedValue({
      _sum: { montant: 0 },
    });
  });

  it('prolonge les baux en cours, recale les statuts et alimente les relances', async () => {
    prismaMock.bailLocatif.findMany
      .mockResolvedValueOnce([
        {
          id: 'bail-1',
          loyerMensuel: 150000,
          jourEcheance: 5,
          dateDebut: new Date('2026-10-01T00:00:00Z'),
          dateFin: null,
        },
      ])
      .mockResolvedValue([{ id: 'bail-1' }]);
    // Le bail n'a plus que jusqu'à septembre 2027 alors qu'on est en août.
    prismaMock.echeanceLoyer.findFirst.mockResolvedValue({
      periode: new Date('2027-09-01T00:00:00Z'),
    });
    prismaMock.echeanceLoyer.createMany.mockResolvedValue({ count: 2 });
    prismaMock.echeanceLoyer.findMany
      // Rafraîchissement des statuts : une échéance dépassée restée « à venir ».
      .mockResolvedValueOnce([
        {
          id: 'ech-1',
          montantPrevu: 150000,
          montantPaye: 0,
          dateEcheance: new Date('2027-07-05T00:00:00Z'),
          statut: 'a_venir',
        },
      ])
      .mockResolvedValue([]);
    prismaMock.echeanceLoyer.update.mockResolvedValue({});

    const bilan = await scheduler.executer(new Date('2027-08-20T00:00:00Z'));

    expect(bilan.echeancesGenerees).toBe(2);
    expect(bilan.statutsRecales).toBe(1);
    expect(prismaMock.echeanceLoyer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { statut: 'impayee' } }),
    );
    // La situation de paiement du bail est recalculée dans le même passage.
    expect(prismaMock.bailLocatif.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'bail-1' },
        data: expect.objectContaining({
          situationPaiement: expect.any(String),
        }),
      }),
    );
  });
});
