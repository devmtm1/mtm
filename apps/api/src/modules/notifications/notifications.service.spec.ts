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
});
