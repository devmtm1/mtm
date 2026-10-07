import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContactService } from './contact.service';

function creer() {
  const prisma = { contact: { findUnique: jest.fn(), update: jest.fn() } };
  const mail = { send: jest.fn().mockResolvedValue(true) };
  const notificationsInternes = {
    notifierClient: jest.fn().mockResolvedValue(1),
    notifierPermission: jest.fn(),
  };
  const service = new ContactService(
    prisma as never,
    { notify: jest.fn() } as never,
    { estVisible: jest.fn() } as never,
    notificationsInternes as never,
    mail as never,
  );
  return { service, prisma, mail, notificationsInternes };
}

const message = {
  id: 'c1',
  nom: 'Awa Diop',
  email: 'awa@exemple.sn',
  sujet: 'Titre foncier',
  message: 'Le titre est-il vérifié ?',
  lu: false,
};

describe('ContactService.repondre', () => {
  it('enregistre la réponse, prend le message en charge, écrit au demandeur et prévient son espace', async () => {
    const { service, prisma, mail, notificationsInternes } = creer();
    prisma.contact.findUnique.mockResolvedValue(message);
    prisma.contact.update.mockResolvedValue({
      ...message,
      lu: true,
      reponse: 'Oui, il est vérifié.',
      reponduLe: new Date('2026-10-07T09:00:00Z'),
    });

    const resultat = await service.repondre('c1', '  Oui, il est vérifié.  ', {
      id: 'u1',
    });

    expect(prisma.contact.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: expect.objectContaining({
        reponse: 'Oui, il est vérifié.',
        reponduParId: 'u1',
        lu: true,
      }),
    });
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'awa@exemple.sn',
        subject: 'Réponse de MTM Immobilier — Titre foncier',
        text: expect.stringContaining('Oui, il est vérifié.'),
      }),
    );
    expect(notificationsInternes.notifierClient).toHaveBeenCalledWith(
      { email: 'awa@exemple.sn' },
      expect.objectContaining({
        type: 'reponse_demande',
        lien: '/espace-client/demandes',
      }),
    );
    expect(resultat.emailEnvoye).toBe(true);
  });

  it('garde la réponse même si l’e-mail ne part pas, et le signale', async () => {
    const { service, prisma, mail } = creer();
    prisma.contact.findUnique.mockResolvedValue(message);
    prisma.contact.update.mockResolvedValue({
      ...message,
      reponse: 'Réponse',
      reponduLe: new Date(),
    });
    mail.send.mockRejectedValue(new Error('SMTP indisponible'));

    const resultat = await service.repondre('c1', 'Réponse', { id: 'u1' });

    expect(resultat.emailEnvoye).toBe(false);
    expect(prisma.contact.update).toHaveBeenCalled();
  });

  it('refuse un message inconnu ou une réponse vide', async () => {
    const { service, prisma } = creer();
    prisma.contact.findUnique.mockResolvedValue(null);
    await expect(
      service.repondre('x', 'Bonjour', { id: 'u1' }),
    ).rejects.toThrow(NotFoundException);

    prisma.contact.findUnique.mockResolvedValue(message);
    await expect(service.repondre('c1', '   ', { id: 'u1' })).rejects.toThrow(
      BadRequestException,
    );
  });
});
