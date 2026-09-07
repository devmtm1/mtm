import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CronService } from './cron.service';

describe('CronService', () => {
  it('détecte les mandats actifs proches de leur échéance une seule fois par jour', async () => {
    const audit = { record: jest.fn() };
    const prisma = {
      mandat: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'm1',
            referenceInterne: 'M-001',
            dateFin: new Date(Date.now() + 2 * 24 * 3600 * 1000),
            alerteEcheanceJours: 30,
            commercialResponsableId: 'u1',
          },
        ]),
      },
      auditLog: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new CronService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
    );

    await service.handleMandatsEcheances();

    expect(prisma.mandat.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { statut: 'Actif', dateFin: expect.any(Object) } }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'mandat.echeance_imminente',
        entityId: 'm1',
      }),
    );
  });
});