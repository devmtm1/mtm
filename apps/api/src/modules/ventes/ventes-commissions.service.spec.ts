import { createVentesTestContext } from './ventes.test-support';

describe('VentesCommissionsService', () => {
  let prismaMock: ReturnType<typeof createVentesTestContext>['prismaMock'];
  let commissions: ReturnType<typeof createVentesTestContext>['commissions'];

  beforeEach(() => {
    ({ prismaMock, commissions } = createVentesTestContext());
  });

  it('calcule une commission avec bonus et palier selon les règles commerciales', async () => {
    prismaMock.dossierVente.findUnique.mockResolvedValue({
      id: 'd1',
      prixVente: 1000000,
    });
    prismaMock.dossierVente.findFirst.mockResolvedValue({ id: 'd1' });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      isActive: true,
      roles: [{ role: { name: 'commercial' } }],
    });
    prismaMock.commissionVente.create.mockResolvedValue({
      id: 'c1',
      montantEstime: 25000,
      commercial: { id: 'u1', firstName: 'Jean', lastName: 'Dupont' },
    });
    prismaMock.dossierVente.update.mockResolvedValue({});

    prismaMock.systemSetting.findUnique.mockResolvedValue({
      value: [
        {
          id: 'commercial-standard',
          typeRegle: 'pourcentage',
          taux: 2,
          bonus: 5000,
          palier: 500000,
        },
      ],
    });

    const result = await commissions.createCommission(
      'd1',
      { commercialId: 'u1', regleId: 'commercial-standard' },
      { id: 'u1', roles: ['commercial'], permissions: ['ventes:modifier'] },
    );

    expect(prismaMock.commissionVente.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          commercialId: 'u1',
          bonus: 5000,
          palier: 500000,
          montantEstime: 25000,
        }),
      }),
    );
    expect(result.montantEstime).toBe(25000);
  });
});
