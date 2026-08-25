import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TerrainsService } from './terrains.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';

describe('TerrainsService', () => {
  let service: TerrainsService;
  let prismaMock: {
    terrain: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    terrainMedia: { create: jest.Mock; findFirst: jest.Mock; delete: jest.Mock };
    terrainDocument: { create: jest.Mock; findFirst: jest.Mock; delete: jest.Mock };
  };
  let cloudinaryMock: { upload: jest.Mock; url: jest.Mock; destroy: jest.Mock };

  beforeEach(() => {
    prismaMock = {
      terrain: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      terrainMedia: { create: jest.fn(), findFirst: jest.fn(), delete: jest.fn() },
      terrainDocument: { create: jest.fn(), findFirst: jest.fn(), delete: jest.fn() },
    };
    cloudinaryMock = {
      upload: jest.fn().mockResolvedValue({
        publicId: 'terrains/t1/image',
        resourceType: 'image',
        secureUrl: 'https://cloudinary.test/terrains/t1/image',
      }),
      url: jest.fn((id: string) => `https://cloudinary.test/${id}`),
      destroy: jest.fn(),
    };
    service = new TerrainsService(
      prismaMock as unknown as PrismaService,
      cloudinaryMock as unknown as CloudinaryService,
      { getRawValue: jest.fn() } as unknown as import('../settings/settings.service').SettingsService,
    );
  });

  it('refuse une référence interne déjà utilisée', async () => {
    prismaMock.terrain.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create({
        referenceInterne: 'T-001',
        nom: 'Terrain test',
        statutJuridique: 'Bail',
        niveauVerification: 'Non vérifié',
        statutCommercial: 'Brouillon',
      }),
    ).rejects.toThrow(ConflictException);
    expect(prismaMock.terrain.create).not.toHaveBeenCalled();
  });

  it('lève une erreur si le terrain à modifier est introuvable', async () => {
    prismaMock.terrain.findUnique.mockResolvedValue(null);

    await expect(service.update('missing', { nom: 'Nouveau nom' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('retire les champs internes de la projection publique', () => {
    const result = service.toPublic({
      id: 't1',
      nom: 'Terrain public',
      prixPublic: 1000000,
      prixAcquisition: 500000,
      marge: 500000,
      commission: 100000,
      notesInternes: 'Confidentiel',
      proprietaire: { lastName: 'Sensible' },
    });

    expect(result).toEqual({ id: 't1', nom: 'Terrain public', prixPublic: 1000000 });
  });

  it('rattache un média au terrain existant', async () => {
    prismaMock.terrain.findUnique.mockResolvedValue({ id: 't1' });
    prismaMock.terrainMedia.create.mockResolvedValue({ id: 'm1', terrainId: 't1' });

    const result = await service.addMedia(
      't1',
      { type: 'photo', title: 'Vue principale' },
      { buffer: Buffer.from('image') } as Express.Multer.File,
    );

    expect(result).toEqual({ id: 'm1', terrainId: 't1' });
    expect(prismaMock.terrainMedia.create).toHaveBeenCalledWith({
      data: {
        terrainId: 't1',
        type: 'photo',
        title: 'Vue principale',
        isPublic: false,
        storageKey: 'terrains/t1/image',
        resourceType: 'image',
      },
    });
  });
});
