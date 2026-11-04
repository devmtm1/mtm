import { NotFoundException } from '@nestjs/common';
import { createMandatsTestContext } from './mandats.test-support';

describe('MandatsLotsService', () => {
  const internalUser = { id: 'u1', roles: ['commercial'], permissions: [] };

  let prismaMock: ReturnType<typeof createMandatsTestContext>['prismaMock'];
  let lots: ReturnType<typeof createMandatsTestContext>['lots'];

  beforeEach(() => {
    ({ prismaMock, lots } = createMandatsTestContext());
  });

  it('refuse d’ajouter un lot sur un mandat inexistant', async () => {
    prismaMock.mandat.findFirst.mockResolvedValue(null);

    await expect(
      lots.addLot('missing', { terrainId: 't1' }, internalUser),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('MandatsLotsService.addProgramme', () => {
  const user = { id: 'u1', roles: ['direction'], permissions: [] };

  it('confie les lots du programme sauf ceux déjà rattachés ou sous un autre mandat exclusif', async () => {
    const { prismaMock, lots } = createMandatsTestContext();
    prismaMock.mandat.findFirst.mockResolvedValue({ id: 'm1' });
    prismaMock.programmeLotissement.findUnique.mockResolvedValue({ id: 'p1' });
    prismaMock.mandat.findUnique.mockResolvedValue({
      exclusivite: true,
      statut: 'Actif',
    });
    prismaMock.terrain.findMany.mockResolvedValue([
      { id: 't1' },
      { id: 't2' },
      { id: 't3' },
      { id: 't4' },
    ]);
    prismaMock.mandatLot.findMany
      .mockResolvedValueOnce([{ terrainId: 't1' }]) // déjà dans ce mandat
      .mockResolvedValueOnce([{ terrainId: 't2' }]); // sous un autre mandat exclusif
    prismaMock.mandatLot.createMany.mockResolvedValue({ count: 2 });

    const res = await lots.addProgramme('m1', 'p1', user);

    expect(res).toEqual({
      ajoutes: 2,
      dejaRattaches: 1,
      exclusifsAilleurs: 1,
    });
    expect(prismaMock.mandatLot.createMany.mock.calls[0][0].data).toEqual([
      { mandatId: 'm1', terrainId: 't3' },
      { mandatId: 'm1', terrainId: 't4' },
    ]);
  });

  it('refuse un programme inexistant', async () => {
    const { prismaMock, lots } = createMandatsTestContext();
    prismaMock.mandat.findFirst.mockResolvedValue({ id: 'm1' });
    prismaMock.programmeLotissement.findUnique.mockResolvedValue(null);
    await expect(lots.addProgramme('m1', 'x', user)).rejects.toThrow(
      NotFoundException,
    );
  });
});
