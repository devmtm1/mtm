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
      expect.objectContaining({
        where: { statut: 'Actif', dateFin: expect.any(Object) },
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'mandat.echeance_imminente',
        entityId: 'm1',
      }),
    );
  });

  it('signale une fois par jour les prospects actifs dont la relance est due', async () => {
    const audit = { record: jest.fn() };
    const hier = new Date(Date.now() - 24 * 3600 * 1000);
    const prisma = {
      prospect: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'p1',
            referenceInterne: 'P-2026-0001',
            nom: 'Diallo',
            prenom: 'Awa',
            prochaineAction: 'Rappeler',
            prochaineRelanceLe: hier,
            commercialResponsableId: 'u1',
          },
          {
            id: 'p2',
            referenceInterne: 'P-2026-0002',
            nom: 'Fall',
            prenom: 'Modou',
            prochaineAction: 'Envoyer les documents',
            prochaineRelanceLe: hier,
            commercialResponsableId: 'u2',
          },
        ]),
      },
      // p2 a déjà été signalé ce matin : pas de doublon.
      auditLog: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: 'log-existant' }),
      },
    };
    const service = new CronService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
    );

    await service.handleProspectsARelancer();

    expect(audit.record).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        action: 'prospect.relance_due',
        entityId: 'p1',
        newValue: expect.objectContaining({ enRetard: true }),
      }),
    );
  });
});
