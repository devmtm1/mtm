import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
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
    terrainMedia: {
      create: jest.Mock;
      findFirst: jest.Mock;
      delete: jest.Mock;
    };
    terrainDocument: {
      create: jest.Mock;
      findFirst: jest.Mock;
      delete: jest.Mock;
    };
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
      terrainMedia: {
        create: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
      terrainDocument: {
        create: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
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
      {
        getRawValue: jest.fn(),
      } as unknown as import('../settings/settings.service').SettingsService,
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

  it('refuse un statut commercial absent du paramétrage', async () => {
    prismaMock.terrain.findUnique.mockResolvedValue(null);

    await expect(
      service.create({
        referenceInterne: 'T-001',
        nom: 'Terrain test',
        statutJuridique: 'Bail',
        niveauVerification: 'Non vérifié',
        statutCommercial: 'Statut inconnu',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prismaMock.terrain.create).not.toHaveBeenCalled();
  });

  it('lève une erreur si le terrain à modifier est introuvable', async () => {
    prismaMock.terrain.findUnique.mockResolvedValue(null);

    await expect(
      service.update('missing', { nom: 'Nouveau nom' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('retire les champs internes de la projection publique', () => {
    const result = service.toPublic({
      id: 't1',
      referenceInterne: 'REF-001',
      nom: 'Terrain public',
      statutJuridique: 'Titre foncier',
      niveauVerification: 'Vérifié',
      region: 'Dakar',
      commune: 'Dakar',
      localisationDetail: 'Corniche',
      latitude: 14.7,
      longitude: -17.4,
      superficie: 500,
      uniteSuperficie: 'm²',
      dimensions: { largeur: 20, profondeur: 25 },
      prixPublic: 1000000,
      misEnAvant: true,
      accesRoutier: 'Bitumé',
      eauDisponible: true,
      electriciteDisponible: true,
      voisinage: 'Résidentiel',
      vocation: 'Habitation',
      proximiteAxes: '500m de la route',
      pointsInteret: { ecole: '200m' },
      medias: [
        {
          id: 'm1',
          type: 'photo',
          title: 'Vue principale',
          isPublic: true,
          sortOrder: 0,
          storageKey: 'terrains/t1/photo',
          resourceType: 'image',
          capturedAt: null,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      documents: [
        {
          id: 'd1',
          type: 'titre_foncier',
          title: 'Titre foncier',
          isPublic: true,
          version: 1,
          storageKey: 'terrains/t1/doc',
          resourceType: 'raw',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      prixAcquisition: 500000,
      marge: 500000,
      commission: 100000,
      notesInternes: 'Confidentiel',
      proprietaire: { lastName: 'Sensible' },
      commercialResponsable: { id: 'u1' },
    });

    expect(result.id).toBe('t1');
    expect(result.nom).toBe('Terrain public');
    expect(result.prixPublic).toBe(1000000);
    expect(result).not.toHaveProperty('prixAcquisition');
    expect(result).not.toHaveProperty('marge');
    expect(result).not.toHaveProperty('commission');
    expect(result).not.toHaveProperty('notesInternes');
    expect(result).not.toHaveProperty('proprietaire');
    expect(result).not.toHaveProperty('commercialResponsable');
    expect(result.medias[0]).not.toHaveProperty('storageKey');
    expect(result.medias[0]).not.toHaveProperty('resourceType');
    expect(result.medias[0]).toHaveProperty('secureUrl');
    expect(result.documents[0]).not.toHaveProperty('storageKey');
    expect(result.documents[0]).not.toHaveProperty('resourceType');
    expect(result.documents[0]).toHaveProperty('secureUrl');
  });

  it('rattache un média au terrain existant', async () => {
    prismaMock.terrain.findUnique.mockResolvedValue({ id: 't1' });
    prismaMock.terrainMedia.create.mockResolvedValue({
      id: 'm1',
      terrainId: 't1',
    });

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

  it('refuse un média dépassant la limite de 10 Mo', async () => {
    prismaMock.terrain.findUnique.mockResolvedValue({ id: 't1' });

    await expect(
      service.addMedia('t1', { type: 'photo' }, {
        buffer: Buffer.from('image'),
        size: 10 * 1024 * 1024 + 1,
      } as Express.Multer.File),
    ).rejects.toThrow(BadRequestException);
    expect(cloudinaryMock.upload).not.toHaveBeenCalled();
  });
});
