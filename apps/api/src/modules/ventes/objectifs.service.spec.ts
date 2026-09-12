import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ObjectifsService } from './objectifs.service';

describe('ObjectifsService', () => {
  let service: ObjectifsService;
  let prismaMock: {
    objectifCommercial: { findUnique: jest.Mock; upsert: jest.Mock };
    dossierVente: { count: jest.Mock };
    paiement: { aggregate: jest.Mock };
    commissionVente: { findMany: jest.Mock };
    user: { findUnique: jest.Mock };
  };
  let auditMock: { record: jest.Mock };

  const manager = { id: 'mgr', roles: ['manager'], permissions: [] };
  const commercial = { id: 'com-1', roles: ['commercial'], permissions: [] };

  beforeEach(() => {
    prismaMock = {
      objectifCommercial: { findUnique: jest.fn(), upsert: jest.fn() },
      dossierVente: { count: jest.fn() },
      paiement: { aggregate: jest.fn() },
      commissionVente: { findMany: jest.fn() },
      user: { findUnique: jest.fn() },
    };
    auditMock = { record: jest.fn().mockResolvedValue(undefined) };
    service = new ObjectifsService(
      prismaMock as unknown as PrismaService,
      auditMock as unknown as AuditService,
    );
  });

  it('formate le mois courant en AAAA-MM', () => {
    expect(
      ObjectifsService.currentPeriode(new Date('2026-09-12T10:00:00Z')),
    ).toBe('2026-09');
    expect(
      ObjectifsService.currentPeriode(new Date('2026-01-31T23:59:59Z')),
    ).toBe('2026-01');
  });

  it('refuse une période mal formée', async () => {
    await expect(
      service.getProgress('com-1', '2026-9', manager),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("interdit à un commercial de consulter la progression d'un autre", async () => {
    await expect(
      service.getProgress('com-2', '2026-09', commercial),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('calcule le réalisé et les taux d’atteinte sur le mois', async () => {
    prismaMock.objectifCommercial.findUnique.mockResolvedValue({
      cibleVentes: 4,
      cibleChiffreAffaires: 20_000_000,
      cibleCommissions: null,
      notes: null,
    });
    prismaMock.dossierVente.count.mockResolvedValue(3);
    prismaMock.paiement.aggregate.mockResolvedValue({
      _sum: { montant: 15_000_000 },
    });
    prismaMock.commissionVente.findMany.mockResolvedValue([
      { montantValide: 500_000, montantPaye: null, montantEstime: 450_000 },
      { montantValide: 300_000, montantPaye: 300_000, montantEstime: 300_000 },
    ]);

    const progress = await service.getProgress('com-1', '2026-09', commercial);

    expect(progress.realise).toEqual({
      ventes: 3,
      chiffreAffaires: 15_000_000,
      commissions: 800_000,
    });
    expect(progress.taux).toEqual({
      ventes: 75,
      chiffreAffaires: 75,
      commissions: null,
    });

    // Les bornes du mois sont bien celles de septembre 2026, en UTC.
    const countArgs = prismaMock.dossierVente.count.mock.calls[0][0] as {
      where: { createdAt: { gte: Date; lt: Date } };
    };
    expect(countArgs.where.createdAt.gte.toISOString()).toBe(
      '2026-09-01T00:00:00.000Z',
    );
    expect(countArgs.where.createdAt.lt.toISOString()).toBe(
      '2026-10-01T00:00:00.000Z',
    );
  });

  it('renvoie des taux nuls sans objectif fixé', async () => {
    prismaMock.objectifCommercial.findUnique.mockResolvedValue(null);
    prismaMock.dossierVente.count.mockResolvedValue(1);
    prismaMock.paiement.aggregate.mockResolvedValue({
      _sum: { montant: null },
    });
    prismaMock.commissionVente.findMany.mockResolvedValue([]);

    const progress = await service.getProgress('com-1', '2026-09', manager);

    expect(progress.objectif).toBeNull();
    expect(progress.taux).toEqual({
      ventes: null,
      chiffreAffaires: null,
      commissions: null,
    });
  });

  it('trace la création puis la mise à jour d’un objectif', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'com-1',
      isActive: true,
    });
    prismaMock.objectifCommercial.findUnique.mockResolvedValueOnce(null);
    prismaMock.objectifCommercial.upsert.mockResolvedValue({
      id: 'obj-1',
      commercialId: 'com-1',
      periode: '2026-09',
      cibleVentes: 4,
      cibleChiffreAffaires: null,
      cibleCommissions: null,
      notes: null,
    });

    await service.upsert(
      { commercialId: 'com-1', periode: '2026-09', cibleVentes: 4 },
      manager,
    );

    expect(auditMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'vente.objectif.created',
        userId: 'mgr',
      }),
    );
  });
});
