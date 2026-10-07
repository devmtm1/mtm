import { Prisma } from '@prisma/client';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../../database/prisma.service';
import type { MailService } from '../../common/mail/mail.service';
import { NotificationsService } from './notifications.service';

function creer() {
  const prisma = {
    notification: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    user: { findMany: jest.fn() },
  };
  const mail = { send: jest.fn().mockResolvedValue(undefined) };
  const config = {
    get: jest.fn().mockReturnValue('https://admin.mtm.test/'),
  };
  const service = new NotificationsService(
    prisma as unknown as PrismaService,
    mail as unknown as MailService,
    config as unknown as ConfigService,
  );
  return { service, prisma, mail };
}

const input = {
  type: 'mandat_echeance',
  titre: 'Mandat M-1 : échéance',
  lien: '/mandats/m1',
  email: true,
};

describe('NotificationsService', () => {
  it('crée une notification par destinataire distinct et envoie l’e-mail avec le lien', async () => {
    const { service, prisma, mail } = creer();
    prisma.notification.create.mockResolvedValue({
      id: 'n1',
      user: { email: 'a@mtm.sn' },
    });

    const creees = await service.notifier(['u1', 'u1', 'u2'], input);

    expect(creees).toBe(2);
    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'a@mtm.sn',
        text: expect.stringContaining('https://admin.mtm.test/mandats/m1'),
      }),
    );
  });

  it('ignore un doublon (clé de dédoublonnage) sans lever ni envoyer d’e-mail', async () => {
    const { service, prisma, mail } = creer();
    prisma.notification.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('doublon', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(service.notifier(['u1'], input)).resolves.toBe(0);
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('une panne d’e-mail ne fait pas échouer la notification', async () => {
    const { service, prisma, mail } = creer();
    prisma.notification.create.mockResolvedValue({
      id: 'n1',
      user: { email: 'a@mtm.sn' },
    });
    mail.send.mockRejectedValue(new Error('SMTP indisponible'));

    await expect(service.notifier(['u1'], input)).resolves.toBe(1);
  });

  it('ne marque lue que la notification du demandeur', async () => {
    const { service, prisma } = creer();
    prisma.notification.updateMany.mockResolvedValue({ count: 0 });

    await service.marquerLue('u1', 'n-autrui');

    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'n-autrui', userId: 'u1', readAt: null },
      }),
    );
  });

  describe('notifications d’espace client', () => {
    it('retrouve les comptes actifs rattachés à la cible, sans en chercher quand elle est vide', async () => {
      const { service, prisma } = creer();
      prisma.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);

      const ids = await service.userIdsClient({
        prospectId: 'p1',
        email: 'Awa@Exemple.sn',
      });

      expect(ids).toEqual(['u1', 'u2']);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isActive: true,
            OR: [
              { clientProspectId: 'p1' },
              {
                clientProspect: {
                  email: { equals: 'Awa@Exemple.sn', mode: 'insensitive' },
                },
              },
            ],
          },
        }),
      );

      prisma.user.findMany.mockClear();
      expect(await service.userIdsClient({})).toEqual([]);
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it('crée la notification du client, sans e-mail, avec une route de son espace', async () => {
      const { service, prisma, mail } = creer();
      prisma.user.findMany.mockResolvedValue([{ id: 'u1' }]);
      prisma.notification.create.mockResolvedValue({
        id: 'n1',
        user: { email: 'c@x.sn' },
      });

      const creees = await service.notifierClient(
        { locataireId: 'l1' },
        {
          type: 'reglement_valide',
          titre: 'Règlement validé',
          lien: '/espace-client/ma-location',
        },
      );

      expect(creees).toBe(1);
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'u1',
            lien: '/espace-client/ma-location',
          }),
        }),
      );
      expect(mail.send).not.toHaveBeenCalled();
    });

    it('un client sans compte n’est pas une erreur : rien n’est créé', async () => {
      const { service, prisma } = creer();
      prisma.user.findMany.mockResolvedValue([]);
      expect(
        await service.notifierClient(
          { prospectId: 'p1' },
          { type: 't', titre: 'T' },
        ),
      ).toBe(0);
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('ne lève jamais, même si la recherche du compte échoue', async () => {
      const { service, prisma } = creer();
      prisma.user.findMany.mockRejectedValue(new Error('base indisponible'));
      await expect(
        service.notifierClient({ prospectId: 'p1' }, { type: 't', titre: 'T' }),
      ).resolves.toBe(0);
    });
  });
});
