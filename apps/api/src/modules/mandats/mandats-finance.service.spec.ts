import { createMandatsTestContext } from './mandats.test-support';
import { Prisma } from '@prisma/client';

describe('MandatsFinanceService', () => {
  const internalUser = { id: 'u1', roles: ['commercial'], permissions: [] };

  let prismaMock: ReturnType<typeof createMandatsTestContext>['prismaMock'];
  let finance: ReturnType<typeof createMandatsTestContext>['finance'];

  beforeEach(() => {
    ({ prismaMock, finance } = createMandatsTestContext());
  });

  it('calcule le résumé financier', async () => {
    prismaMock.mandat.findFirst.mockResolvedValue({
      id: 'm1',
      lots: [
        {
          terrain: {
            prixPublic: new Prisma.Decimal(1000000),
            statutCommercial: 'Vendu',
          },
        },
        {
          terrain: {
            prixPublic: new Prisma.Decimal(2000000),
            statutCommercial: 'Disponible',
          },
        },
      ],
    });

    const result = await finance.getFinancialSummary('m1', internalUser);
    expect(result).toEqual({
      mandatId: 'm1',
      chiffreAffaires: 1000000,
      commissionsEstimees: 50000,
      resteACommercialiser: 2000000,
    });
  });
});
