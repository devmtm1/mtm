import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ContentBlockService } from './content-block.service';

describe('ContentBlockService public contract', () => {
  let service: ContentBlockService;
  let prismaMock: {
    contentBlock: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  beforeEach(() => {
    prismaMock = {
      contentBlock: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    service = new ContentBlockService(prismaMock as unknown as PrismaService);
  });

  it('ne retourne que les contenus actifs et les champs publics', async () => {
    prismaMock.contentBlock.findMany.mockResolvedValue([]);

    await service.findAll();

    expect(prismaMock.contentBlock.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      select: { key: true, title: true, content: true, type: true },
      orderBy: [{ type: 'asc' }, { ordre: 'asc' }],
    });
  });

  it('exclut un contenu désactivé lors de la recherche par clé', async () => {
    prismaMock.contentBlock.findUnique.mockResolvedValue(null);

    await expect(service.findByKey('home.hero.title')).rejects.toThrow(
      NotFoundException,
    );
    expect(prismaMock.contentBlock.findUnique).toHaveBeenCalledWith({
      where: { key: 'home.hero.title', isActive: true },
      select: { key: true, title: true, content: true, type: true },
    });
  });
});
