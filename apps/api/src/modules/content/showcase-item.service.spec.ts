import { ShowcaseItemService } from './showcase-item.service';

describe('ShowcaseItemService', () => {
  const dto = {
    category: 'realisation',
    title: 'Résidence test',
    isActive: true,
  };

  function createService() {
    const prisma = {
      showcaseItem: {
        create: jest.fn().mockResolvedValue({ id: 'showcase-1' }),
      },
    };
    const service = new ShowcaseItemService(prisma as never, {} as never);
    return { prisma, service };
  }

  it('crée un contenu en brouillon pour un rédacteur sans droit de publication', async () => {
    const { prisma, service } = createService();

    await service.create(dto, {
      id: 'user-1',
      roles: ['commercial'],
      permissions: ['content:creer'],
    });

    expect(prisma.showcaseItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isActive: false }),
      }),
    );
  });

  it('autorise un publieur à rendre le contenu public dès sa création', async () => {
    const { prisma, service } = createService();

    await service.create(dto, {
      id: 'user-1',
      roles: [],
      permissions: ['content:creer', 'content:publier'],
    });

    expect(prisma.showcaseItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isActive: true }),
      }),
    );
  });
});
