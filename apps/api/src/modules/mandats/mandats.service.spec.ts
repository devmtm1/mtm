import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MandatsService } from './mandats.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { AuditService } from '../audit/audit.service';
import { Prisma } from '@prisma/client';

describe('MandatsService', () => {
  let service: MandatsService;
  let prismaMock: {
    mandat: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    mandatLot: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      groupBy: jest.Mock;
      count: jest.Mock;
    };
    mandatDocument: {
      create: jest.Mock;
      findFirst: jest.Mock;
      delete: jest.Mock;
    };
    systemSetting: {
      findUnique: jest.Mock;
    };
    auditLog: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
    terrain: {
      findUnique: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
    proprietaire: {
      findUnique: jest.Mock;
    };
  };
  let cloudinaryMock: { upload: jest.Mock; url: jest.Mock; destroy: jest.Mock };
  let auditMock: { record: jest.Mock };

  beforeEach(() => {
    prismaMock = {
      mandat: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      mandatLot: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        groupBy: jest.fn(),
        count: jest.fn(),
      },
      mandatDocument: {
        create: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
      systemSetting: {
        findUnique: jest.fn(),
      },
      auditLog: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      terrain: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      proprietaire: {
        findUnique: jest.fn(),
      },
    };
    cloudinaryMock = {
      upload: jest.fn().mockResolvedValue({
        publicId: 'mtm/mandats/m1/documents/doc1',
        resourceType: 'raw',
        secureUrl: 'https://cloudinary.test/mtm/mandats/m1/documents/doc1',
      }),
      url: jest.fn((id: string) => `https://cloudinary.test/${id}`),
      destroy: jest.fn(),
    };
    auditMock = { record: jest.fn() };

    service = new MandatsService(
      prismaMock as unknown as PrismaService,
      auditMock as unknown as AuditService,
      cloudinaryMock as unknown as CloudinaryService,
    );
  });

  it('rejette une référence interne déjà utilisée', async () => {
    prismaMock.mandat.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create({
        referenceInterne: 'M-001',
        proprietaireId: 'p1',
        typeMandat: 'Vente',
        dateDebut: '2026-01-01',
        dateFin: '2027-01-01',
        statut: 'Brouillon',
      }),
    ).rejects.toThrow(ConflictException);
    expect(prismaMock.mandat.create).not.toHaveBeenCalled();
  });

  it('rejette un statut de mandat invalide', async () => {
    prismaMock.mandat.findUnique.mockResolvedValue(null);
    prismaMock.systemSetting.findUnique.mockResolvedValue({
      value: ['Brouillon', 'Actif'],
    });

    await expect(
      service.create({
        referenceInterne: 'M-002',
        proprietaireId: 'p1',
        typeMandat: 'Vente',
        dateDebut: '2026-01-01',
        dateFin: '2027-01-01',
        statut: 'Invalide',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prismaMock.mandat.create).not.toHaveBeenCalled();
  });

  it('refuse un type de document invalide', async () => {
    prismaMock.mandat.findUnique.mockResolvedValue({ id: 'm1' });
    prismaMock.systemSetting.findUnique.mockResolvedValue({
      value: ['contrat', 'avenant'],
    });

    await expect(
      service.addDocument('m1', { type: 'photo' }, {
        buffer: Buffer.from('image'),
        size: 1024,
      } as Express.Multer.File),
    ).rejects.toThrow(BadRequestException);
    expect(cloudinaryMock.upload).not.toHaveBeenCalled();
  });

  it('calcule le résumé financier', async () => {
    prismaMock.mandat.findUnique.mockResolvedValue({
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

    const result = await service.getFinancialSummary('m1');
    expect(result).toEqual({
      mandatId: 'm1',
      chiffreAffaires: 1000000,
      commissionsEstimees: 50000,
      resteACommercialiser: 2000000,
    });
  });

  it('refuse d’ajouter un lot sur un mandat inexistant', async () => {
    prismaMock.mandat.findUnique.mockResolvedValue(null);

    await expect(
      service.addLot('missing', { terrainId: 't1' }),
    ).rejects.toThrow(NotFoundException);
  });
});
