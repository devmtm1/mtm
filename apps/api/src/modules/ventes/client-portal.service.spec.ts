import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ClientPortalService } from './client-portal.service';

describe('ClientPortalService – demandes depuis l’espace client', () => {
  const prisma = { user: { findUnique: jest.fn() } };
  const contacts = { create: jest.fn() };
  const ventes = { createPublicReservationRequest: jest.fn() };
  let service: ClientPortalService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ClientPortalService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      contacts as never,
      ventes as never,
    );
    prisma.user.findUnique.mockResolvedValue({
      clientProspect: {
        nom: 'Diop',
        prenom: 'Awa',
        email: 'awa@example.com',
        telephone: '+221770000000',
      },
    });
  });

  it('crée un message avec l’identité du compte, jamais celle du formulaire', async () => {
    contacts.create.mockResolvedValue({ id: 'c1' });

    const result = await service.createClientDemande('u1', {
      type: 'visite',
      message: 'Je souhaite visiter samedi matin.',
      terrainId: 't1',
    });

    expect(result).toEqual({ kind: 'message', id: 'c1' });
    expect(contacts.create).toHaveBeenCalledWith({
      nom: 'Awa Diop',
      email: 'awa@example.com',
      telephone: '+221770000000',
      sujet: 'Demande de visite',
      message: 'Je souhaite visiter samedi matin.',
      terrainId: 't1',
    });
  });

  it('transmet une réservation au circuit des demandes publiques', async () => {
    ventes.createPublicReservationRequest.mockResolvedValue({ id: 'r1' });

    const result = await service.createClientDemande('u1', {
      type: 'reservation',
      message: 'Je réserve ce terrain.',
      terrainId: 't1',
    });

    expect(result).toEqual({ kind: 'reservation', id: 'r1' });
    expect(ventes.createPublicReservationRequest).toHaveBeenCalledWith(
      expect.objectContaining({ terrainId: 't1', email: 'awa@example.com' }),
    );
  });

  it('refuse une réservation sans terrain', async () => {
    await expect(
      service.createClientDemande('u1', {
        type: 'reservation',
        message: 'Je réserve un terrain.',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse un compte non rattaché à un client', async () => {
    prisma.user.findUnique.mockResolvedValue({ clientProspect: null });
    await expect(
      service.createClientDemande('u1', {
        type: 'information',
        message: 'Bonjour, une question.',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
