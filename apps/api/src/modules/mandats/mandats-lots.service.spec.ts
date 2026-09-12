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
