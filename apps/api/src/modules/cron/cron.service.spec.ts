import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CronService } from './cron.service';

describe('CronService', () => {
  it('détecte les mandats actifs proches de leur échéance une seule fois par jour', async () => {
    const audit = { record: jest.fn() };
    const notifications = {
      notifier: jest.fn().mockResolvedValue(1),
      notifierPermission: jest.fn().mockResolvedValue(1),
      purgerLues: jest.fn().mockResolvedValue(0),
    };
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
      notifications as unknown as NotificationsService,
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
    // Le commercial responsable est aussi prévenu, par e-mail.
    expect(notifications.notifier).toHaveBeenCalledWith(
      ['u1'],
      expect.objectContaining({
        type: 'mandat_echeance',
        email: true,
        lien: '/mandats/m1',
        dedupeKey: expect.stringMatching(
          /^mandat-echeance:m1:\d{4}-\d{2}-\d{2}$/,
        ),
      }),
    );
  });

  it('signale une fois par jour les prospects actifs dont la relance est due', async () => {
    const audit = { record: jest.fn() };
    const notifications = {
      notifier: jest.fn().mockResolvedValue(1),
      notifierPermission: jest.fn().mockResolvedValue(1),
      purgerLues: jest.fn().mockResolvedValue(0),
    };
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
      notifications as unknown as NotificationsService,
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

  describe('tâches horaires : une alerte par jour au plus', () => {
    const creer = (dejaTrace: boolean, prisma: Record<string, unknown>) => {
      const audit = { record: jest.fn() };
      const notifications = {
        notifier: jest.fn().mockResolvedValue(1),
        notifierPermission: jest.fn().mockResolvedValue(1),
        purgerLues: jest.fn().mockResolvedValue(0),
      };
      const service = new CronService(
        {
          ...prisma,
          auditLog: {
            findFirst: jest
              .fn()
              .mockResolvedValue(dejaTrace ? { id: 'a1' } : null),
          },
        } as unknown as PrismaService,
        audit as unknown as AuditService,
        notifications as unknown as NotificationsService,
      );
      return { service, audit };
    };

    const tache = {
      id: 't1',
      titre: 'Rappeler le client',
      dateEcheance: new Date(Date.now() - 3600 * 1000),
      prospectId: 'p1',
      prospect: {
        id: 'p1',
        nom: 'Ndiaye',
        prenom: 'A',
        commercialResponsableId: 'u1',
      },
    };

    it.each([
      [false, 1],
      [true, 0],
    ])(
      'tâche CRM en retard — déjà tracée aujourd’hui : %p → %i entrée(s)',
      async (dejaTrace, attendu) => {
        const { service, audit } = creer(dejaTrace, {
          activiteCrm: { findMany: jest.fn().mockResolvedValue([tache]) },
        });
        await service.handleCrmRelances();
        expect(audit.record).toHaveBeenCalledTimes(attendu);
      },
    );

    it.each([
      [false, 1],
      [true, 0],
    ])(
      'réservation payée en partie — déjà tracée aujourd’hui : %p → %i entrée(s)',
      async (dejaTrace, attendu) => {
        const { service, audit } = creer(dejaTrace, {
          reservation: {
            findMany: jest.fn().mockResolvedValue([
              {
                id: 'r1',
                dossierVenteId: 'd1',
                dossierVente: {
                  id: 'd1',
                  statut: 'paiement_partiel',
                  terrainId: 't1',
                  paiements: [{ id: 'p1' }],
                },
              },
            ]),
          },
        });
        await service.handleReservationsExpirees();
        expect(audit.record).toHaveBeenCalledTimes(attendu);
      },
    );
  });
});
