import { AuditService } from './audit.service';
import { PrismaService } from '../../database/prisma.service';

describe('AuditService', () => {
  let service: AuditService;
  let prismaMock: {
    auditLog: { create: jest.Mock; findMany: jest.Mock; count: jest.Mock };
  };

  beforeEach(() => {
    prismaMock = {
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    service = new AuditService(prismaMock as unknown as PrismaService);
  });

  describe('record', () => {
    it("écrit une entrée d'audit avec les champs fournis", async () => {
      await service.record({
        userId: 'u1',
        action: 'user.created',
        entityType: 'User',
        entityId: 'u2',
        newValue: { email: 'a@b.com' },
        ipAddress: '127.0.0.1',
      });

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'u1',
          action: 'user.created',
          entityType: 'User',
          entityId: 'u2',
          ipAddress: '127.0.0.1',
        }),
      });
    });

    it("n'échoue jamais même si l'écriture en base échoue", async () => {
      prismaMock.auditLog.create.mockRejectedValue(new Error('DB down'));

      await expect(
        service.record({ action: 'x', entityType: 'Y' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('applique la pagination par défaut (page 1, taille 50)', async () => {
      await service.findAll({});

      expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 50 }),
      );
    });

    it('plafonne la taille de page à 200', async () => {
      await service.findAll({}, { pageSize: 9999 });

      expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 200 }),
      );
    });

    it('calcule correctement le skip pour la pagination', async () => {
      await service.findAll({}, { page: 3, pageSize: 20 });

      expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, take: 20 }),
      );
    });

    it('applique les filtres fournis dans la clause where', async () => {
      await service.findAll({ userId: 'u1', entityType: 'User' });

      expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u1', entityType: 'User' },
        }),
      );
    });

    it('retourne total et totalPages calculés', async () => {
      prismaMock.auditLog.count.mockResolvedValue(105);

      const result = await service.findAll({}, { page: 1, pageSize: 50 });

      expect(result.total).toBe(105);
      expect(result.totalPages).toBe(3);
    });
  });
});
