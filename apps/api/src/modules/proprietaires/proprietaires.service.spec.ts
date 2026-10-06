import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ClientAccountsService } from '../client-accounts/client-accounts.service';
import { ProprietairesService } from './proprietaires.service';

describe('ProprietairesService.createClientAccount', () => {
  const prismaMock = {
    proprietaire: { findUnique: jest.fn() },
    role: { findUnique: jest.fn() },
    user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  };
  const configMock = { get: jest.fn() };
  const mailMock = { send: jest.fn().mockResolvedValue(true) };
  let service: ProprietairesService;

  const proprietaire = {
    id: 'prop-1',
    email: 'prop@example.com',
    firstName: 'Moussa',
    lastName: 'Sy',
    clientUser: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mailMock.send.mockResolvedValue(true);
    // L'ouverture de compte est mutualisée : on monte le service partagé sur
    // les mêmes doublures, le comportement attendu ne change pas.
    service = new ProprietairesService(
      prismaMock as never,
      new ClientAccountsService(
        prismaMock as never,
        configMock as never,
        mailMock as never,
      ),
    );
  });

  it('ouvre un compte client et envoie l’invitation par e-mail', async () => {
    configMock.get.mockReturnValue('https://mtm-immobilier.sn');
    prismaMock.proprietaire.findUnique.mockResolvedValue(proprietaire);
    prismaMock.role.findUnique.mockResolvedValue({ id: 'role-client' });
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'user-1',
      email: proprietaire.email,
      firstName: proprietaire.firstName,
      lastName: proprietaire.lastName,
    });

    const result = await service.createClientAccount(
      'prop-1',
      'MotDePasse123!',
    );

    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ clientProprietaireId: 'prop-1' }),
      }),
    );
    expect(mailMock.send).toHaveBeenCalled();
    expect(result.invitationSent).toBe(true);
    expect(result.resetToken).toBeUndefined();
  });

  it('refuse si le propriétaire est introuvable', async () => {
    prismaMock.proprietaire.findUnique.mockResolvedValue(null);

    await expect(
      service.createClientAccount('inconnu', 'MotDePasse123!'),
    ).rejects.toThrow(NotFoundException);
  });

  it('refuse si un compte existe déjà pour ce propriétaire', async () => {
    prismaMock.proprietaire.findUnique.mockResolvedValue({
      ...proprietaire,
      clientUser: { id: 'user-existant' },
    });

    await expect(
      service.createClientAccount('prop-1', 'MotDePasse123!'),
    ).rejects.toThrow(ConflictException);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('refuse si le propriétaire n’a pas d’adresse e-mail', async () => {
    prismaMock.proprietaire.findUnique.mockResolvedValue({
      ...proprietaire,
      email: null,
    });

    await expect(
      service.createClientAccount('prop-1', 'MotDePasse123!'),
    ).rejects.toThrow(BadRequestException);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('ajoute l’espace propriétaire au compte client que la personne a déjà', async () => {
    prismaMock.proprietaire.findUnique.mockResolvedValue(proprietaire);
    prismaMock.role.findUnique.mockResolvedValue({ id: 'role-client' });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'compte-client',
      firstName: 'Moussa',
      lastName: 'Fall',
      email: proprietaire.email,
      clientProspectId: 'prospect-1',
      clientProprietaireId: null,
      clientLocataireId: null,
      roles: [{ role: { name: 'client' } }],
    });
    prismaMock.user.update.mockResolvedValue({});

    const result = await service.createClientAccount(
      'prop-1',
      'MotDePasse123!',
    );

    expect(result.compteExistant).toBe(true);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'compte-client' },
      data: { clientProprietaireId: 'prop-1' },
    });
  });

  it('refuse si l’adresse e-mail est celle d’un compte du personnel', async () => {
    prismaMock.proprietaire.findUnique.mockResolvedValue(proprietaire);
    prismaMock.role.findUnique.mockResolvedValue({ id: 'role-client' });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'un-agent',
      roles: [{ role: { name: 'commercial' } }],
    });

    await expect(
      service.createClientAccount('prop-1', 'MotDePasse123!'),
    ).rejects.toThrow(ConflictException);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });
});
