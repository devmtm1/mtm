import { BadRequestException, ConflictException } from '@nestjs/common';
import { ClientAccountsService } from './client-accounts.service';

describe('ClientAccountsService – ouverture avec e-mail ou téléphone', () => {
  const prisma = {
    role: { findUnique: jest.fn() },
    user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  };
  const config = { get: jest.fn().mockReturnValue('https://mtm.test') };
  const mail = { send: jest.fn() };
  const canaux = { estConfigure: jest.fn(), envoyer: jest.fn() };
  let service: ClientAccountsService;

  const demande = {
    email: null as string | null,
    telephone: null as string | null,
    firstName: 'Awa',
    lastName: 'Diop',
    password: 'MotDePasseClient123!',
    rattachement: { clientProspectId: 'prospect-1' },
    introduction: 'Votre espace client est ouvert.',
  };

  beforeEach(() => {
    jest.resetAllMocks();
    config.get.mockReturnValue('https://mtm.test');
    prisma.role.findUnique.mockResolvedValue({ id: 'role-client' });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: 'user-1',
          email: data.email ?? null,
          telephoneConnexion: data.telephoneConnexion ?? null,
          firstName: data.firstName,
          lastName: data.lastName,
        }),
    );
    mail.send.mockResolvedValue(true);
    canaux.estConfigure.mockReturnValue(false);
    canaux.envoyer.mockResolvedValue(true);
    service = new ClientAccountsService(
      prisma as never,
      config as never,
      mail as never,
      canaux as never,
    );
  });

  it('refuse d’ouvrir un espace sans e-mail ni téléphone', async () => {
    await expect(service.ouvrir(demande)).rejects.toThrow(BadRequestException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('refuse un numéro qui n’en est pas un quand il n’y a pas d’e-mail', async () => {
    await expect(
      service.ouvrir({ ...demande, telephone: '12 34' }),
    ).rejects.toThrow('numéro de téléphone n’est pas valable');
  });

  it('ouvre l’espace avec le seul numéro, rangé au format international', async () => {
    const resultat = await service.ouvrir({
      ...demande,
      telephone: '77 123 45 67',
    });

    expect(prisma.user.create.mock.calls[0][0].data).toMatchObject({
      email: null,
      telephoneConnexion: '+221771234567',
      mustChangePassword: true,
      clientProspectId: 'prospect-1',
    });
    expect(resultat).toMatchObject({
      email: null,
      telephone: '+221771234567',
      compteExistant: false,
    });
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('envoie l’invitation par WhatsApp quand le client n’a pas d’e-mail', async () => {
    canaux.estConfigure.mockImplementation(
      (canal: string) => canal === 'whatsapp',
    );

    const resultat = await service.ouvrir({
      ...demande,
      telephone: '771234567',
    });

    expect(canaux.envoyer).toHaveBeenCalledWith(
      expect.objectContaining({
        canal: 'whatsapp',
        destinataire: '+221771234567',
      }),
    );
    expect(canaux.envoyer.mock.calls[0][0].texte).toContain(
      'https://mtm.test/espace-client/connexion?reset=',
    );
    expect(resultat).toMatchObject({
      invitationSent: true,
      canalInvitation: 'whatsapp',
      resetToken: undefined,
    });
  });

  it('rend le jeton au collaborateur quand aucun canal n’a pu partir', async () => {
    const resultat = await service.ouvrir({
      ...demande,
      telephone: '771234567',
    });

    expect(resultat.invitationSent).toBe(false);
    expect(resultat.canalInvitation).toBeNull();
    expect(resultat.resetToken).toHaveLength(64);
  });

  it('invite par e-mail quand il y en a un, et garde le numéro comme second identifiant', async () => {
    const resultat = await service.ouvrir({
      ...demande,
      email: 'awa@example.com',
      telephone: '77 123 45 67',
    });

    expect(prisma.user.create.mock.calls[0][0].data).toMatchObject({
      email: 'awa@example.com',
      telephoneConnexion: '+221771234567',
    });
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'awa@example.com' }),
    );
    expect(canaux.envoyer).not.toHaveBeenCalled();
    expect(resultat.canalInvitation).toBe('email');
  });

  it('rattache le nouvel espace au compte client qui a déjà ce numéro', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-9',
      firstName: 'Awa',
      lastName: 'Diop',
      email: null,
      telephoneConnexion: '+221771234567',
      clientProspectId: null,
      clientProprietaireId: null,
      clientLocataireId: null,
      roles: [{ role: { name: 'client' } }],
    });

    const resultat = await service.ouvrir({
      ...demande,
      telephone: '77 123 45 67',
      rattachement: { clientProprietaireId: 'prop-1' },
    });

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-9' },
      data: { clientProprietaireId: 'prop-1' },
    });
    expect(resultat).toMatchObject({ compteExistant: true, id: 'user-9' });
  });

  it('refuse un numéro déjà utilisé par un compte du personnel', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-2',
      firstName: 'Fatou',
      lastName: 'Sy',
      email: 'fatou@mtm.sn',
      telephoneConnexion: '+221771234567',
      clientProspectId: null,
      clientProprietaireId: null,
      clientLocataireId: null,
      roles: [{ role: { name: 'commercial' } }],
    });

    await expect(
      service.ouvrir({ ...demande, telephone: '771234567' }),
    ).rejects.toThrow(ConflictException);
  });

  it('refuse quand l’e-mail et le numéro appartiennent à deux comptes différents', async () => {
    const compte = (id: string) => ({
      id,
      firstName: 'A',
      lastName: 'B',
      email: null,
      telephoneConnexion: null,
      clientProspectId: null,
      clientProprietaireId: null,
      clientLocataireId: null,
      roles: [{ role: { name: 'client' } }],
    });
    prisma.user.findUnique
      .mockResolvedValueOnce(compte('a'))
      .mockResolvedValueOnce(compte('b'));

    await expect(
      service.ouvrir({
        ...demande,
        email: 'awa@example.com',
        telephone: '771234567',
      }),
    ).rejects.toThrow('deux comptes différents');
  });
});
