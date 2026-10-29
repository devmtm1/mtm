import { orienterParcours } from './parcours';

describe('orienterParcours', () => {
  const prisma = {
    prospect: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
  };

  beforeEach(() => jest.clearAllMocks());

  it('oriente vers la vérification une fiche sans dossier de vente ni visite', async () => {
    await orienterParcours(prisma as never, 'p1', 'verification');

    expect(prisma.prospect.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'p1',
        parcours: 'acheteur',
        dossiers: { none: {} },
        visites: { none: {} },
      },
      data: { parcours: 'verification' },
    });
  });

  it('ne touche jamais une fiche déjà orientée à la main (le filtre exige « acheteur »)', async () => {
    await orienterParcours(prisma as never, 'p1', 'chantier');

    const { where } = prisma.prospect.updateMany.mock.calls[0][0];
    expect(where.parcours).toBe('acheteur');
    expect(where.dossiers).toEqual({ none: {} });
  });
});
