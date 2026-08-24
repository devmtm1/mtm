import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { PrismaService } from '../../database/prisma.service';

describe('RolesService', () => {
  let service: RolesService;
  let prismaMock: {
    role: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    permission: { findMany: jest.Mock };
    rolePermission: { upsert: jest.Mock; deleteMany: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prismaMock = {
      role: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      permission: { findMany: jest.fn() },
      rolePermission: { upsert: jest.fn(), deleteMany: jest.fn() },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
    };

    service = new RolesService(prismaMock as unknown as PrismaService);
  });

  describe('create', () => {
    it('rejette si un rôle du même nom existe déjà', async () => {
      prismaMock.role.findUnique.mockResolvedValue({ id: 'r1' });

      await expect(
        service.create({ name: 'commercial', description: 'x' }),
      ).rejects.toThrow(ConflictException);
    });

    it('crée le rôle si le nom est disponible', async () => {
      prismaMock.role.findUnique.mockResolvedValue(null);
      prismaMock.role.create.mockResolvedValue({
        id: 'r1',
        name: 'commercial',
      });

      const result = await service.create({ name: 'commercial' });

      expect(result.name).toBe('commercial');
      expect(prismaMock.role.create).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it("lève NotFoundException si le rôle n'existe pas", async () => {
      prismaMock.role.findUnique.mockResolvedValue(null);

      await expect(service.findById('inconnu')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('empêche la suppression d’un rôle système', async () => {
      prismaMock.role.findUnique.mockResolvedValue({
        id: 'r1',
        isSystem: true,
      });

      await expect(service.remove('r1')).rejects.toThrow(BadRequestException);
      expect(prismaMock.role.delete).not.toHaveBeenCalled();
    });

    it('supprime un rôle non système', async () => {
      prismaMock.role.findUnique.mockResolvedValue({
        id: 'r1',
        isSystem: false,
      });

      await service.remove('r1');

      expect(prismaMock.role.delete).toHaveBeenCalledWith({
        where: { id: 'r1' },
      });
    });
  });

  describe('assignPermissions', () => {
    it('rejette si des permissions demandées sont inconnues', async () => {
      prismaMock.role.findUnique.mockResolvedValue({ id: 'r1' });
      prismaMock.permission.findMany.mockResolvedValue([
        { id: 'p1', name: 'users:consulter' },
      ]);

      await expect(
        service.assignPermissions('r1', ['users:consulter', 'inconnu:action']),
      ).rejects.toThrow(BadRequestException);
    });

    it('attribue les permissions valides via transaction', async () => {
      prismaMock.role.findUnique.mockResolvedValue({ id: 'r1' });
      prismaMock.permission.findMany.mockResolvedValue([
        { id: 'p1', name: 'users:consulter' },
        { id: 'p2', name: 'users:creer' },
      ]);
      prismaMock.rolePermission.upsert.mockResolvedValue({});

      await service.assignPermissions('r1', ['users:consulter', 'users:creer']);

      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(prismaMock.rolePermission.upsert).toHaveBeenCalledTimes(2);
    });
  });
});
