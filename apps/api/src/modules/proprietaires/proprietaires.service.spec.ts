import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProprietairesService } from './proprietaires.service';
import { PrismaService } from '../../database/prisma.service';

describe('ProprietairesService', () => {
  let service: ProprietairesService;
  let prismaMock: {
    proprietaire: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(() => {
    prismaMock = {
      proprietaire: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new ProprietairesService(prismaMock as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('retourne les propriétaires triés par nom de famille', async () => {
      prismaMock.proprietaire.findMany.mockResolvedValue([
        { id: 'p1', firstName: 'Aminata', lastName: 'Ndiaye' },
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(prismaMock.proprietaire.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });
    });
  });

  describe('findById', () => {
    it('lève NotFoundException si le propriétaire n’existe pas', async () => {
      prismaMock.proprietaire.findUnique.mockResolvedValue(null);

      await expect(service.findById('inconnu')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('retourne le propriétaire complet si trouvé', async () => {
      prismaMock.proprietaire.findUnique.mockResolvedValue({
        id: 'p1',
        firstName: 'Aminata',
        lastName: 'Ndiaye',
      });

      const result = await service.findById('p1');

      expect(result.id).toBe('p1');
    });
  });

  describe('create', () => {
    it('rejette si un propriétaire avec le même email existe', async () => {
      prismaMock.proprietaire.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create({
          firstName: 'A',
          lastName: 'B',
          email: 'dup@test.com',
        }),
      ).rejects.toThrow(ConflictException);
      expect(prismaMock.proprietaire.create).not.toHaveBeenCalled();
    });

    it('crée le propriétaire si l’email est libre', async () => {
      prismaMock.proprietaire.findFirst.mockResolvedValue(null);
      prismaMock.proprietaire.create.mockResolvedValue({
        id: 'p1',
        firstName: 'Aminata',
        lastName: 'Ndiaye',
        email: 'a@test.com',
      });

      const result = await service.create({
        firstName: 'Aminata',
        lastName: 'Ndiaye',
        email: 'a@test.com',
      });

      expect(result.id).toBe('p1');
      expect(prismaMock.proprietaire.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('lève NotFoundException si le propriétaire n’existe pas', async () => {
      prismaMock.proprietaire.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { firstName: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('lève NotFoundException si le propriétaire n’existe pas', async () => {
      prismaMock.proprietaire.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('supprime le propriétaire si trouvé', async () => {
      prismaMock.proprietaire.findUnique.mockResolvedValue({ id: 'p1' });
      prismaMock.proprietaire.delete.mockResolvedValue({});

      await service.remove('p1');

      expect(prismaMock.proprietaire.delete).toHaveBeenCalledWith({
        where: { id: 'p1' },
      });
    });
  });
});
