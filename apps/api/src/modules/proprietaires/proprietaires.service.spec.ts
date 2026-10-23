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

describe('ProprietairesService : biens confiés', () => {
  const prismaMock = {
    proprietaire: { findMany: jest.fn(), findUnique: jest.fn() },
  };
  const service = new ProprietairesService(prismaMock as never, {} as never);

  it('compte aussi les biens en gestion locative, pas seulement les terrains', async () => {
    prismaMock.proprietaire.findMany.mockResolvedValue([]);
    await service.findAll();
    const requete = prismaMock.proprietaire.findMany.mock.calls[0][0];
    expect(requete.select._count.select).toEqual({
      terrains: true,
      biensLocatifs: true,
      mandats: true,
    });
  });

  it('renvoie le nombre de biens en gestion sur la fiche', async () => {
    prismaMock.proprietaire.findUnique.mockResolvedValue({
      id: 'p1',
      _count: { terrains: 0, biensLocatifs: 1, mandats: 0 },
    });
    const fiche = await service.findById('p1');
    expect(fiche._count.biensLocatifs).toBe(1);
    const requete = prismaMock.proprietaire.findUnique.mock.calls[0][0];
    expect(requete.select._count.select.biensLocatifs).toBe(true);
  });
});

describe('ProprietairesService : matricule et coordonnées', () => {
  const fiche = {
    id: 'p1',
    matricule: 'PRO-2026-0002',
    firstName: 'Aminata',
    lastName: 'Ndiaye',
    email: 'a@ex.sn',
    phone: '770000000',
    _count: { terrains: 0, biensLocatifs: 0, mandats: 0 },
  };
  const prismaMock = {
    proprietaire: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const service = new ProprietairesService(prismaMock as never, {} as never);
  const annee = new Date().getFullYear();

  beforeEach(() => jest.resetAllMocks());

  it('donne le matricule suivant du même millésime', async () => {
    prismaMock.proprietaire.findMany.mockResolvedValue([
      { matricule: `PRO-${annee}-0007` },
      { matricule: `PRO-${annee}-0003` },
    ]);
    await expect(service.prochainMatricule()).resolves.toBe(
      `PRO-${annee}-0008`,
    );
  });

  it('crée la fiche avec un matricule généré', async () => {
    prismaMock.proprietaire.findMany.mockResolvedValue([]);
    prismaMock.proprietaire.create.mockResolvedValue(fiche);
    await service.create({ firstName: 'Aminata', lastName: 'Ndiaye' });
    expect(prismaMock.proprietaire.create.mock.calls[0][0].data.matricule).toBe(
      `PRO-${annee}-0001`,
    );
  });

  it('réessaie quand deux créations visent le même matricule', async () => {
    prismaMock.proprietaire.findMany.mockResolvedValue([]);
    prismaMock.proprietaire.create
      .mockRejectedValueOnce({ code: 'P2002', meta: { target: ['matricule'] } })
      .mockResolvedValueOnce(fiche);
    await service.create({ firstName: 'A', lastName: 'B' });
    expect(prismaMock.proprietaire.create).toHaveBeenCalledTimes(2);
  });

  it('masque e-mail et téléphone hors administrateur, matricule conservé', async () => {
    prismaMock.proprietaire.findUnique.mockResolvedValue(fiche);
    const vue = await service.findById('p1', { roles: ['commercial'] });
    expect(vue).toMatchObject({
      matricule: 'PRO-2026-0002',
      firstName: 'Aminata',
      email: null,
      phone: null,
      coordonneesMasquees: true,
    });
    const admin = await service.findById('p1', { roles: ['administrateur'] });
    expect(admin.email).toBe('a@ex.sn');
  });

  it('liste sans coordonnées pour un commercial', async () => {
    prismaMock.proprietaire.findMany.mockResolvedValue([fiche]);
    const [ligne] = await service.findAll({ roles: ['commercial'] });
    expect(ligne.phone).toBeNull();
    expect(ligne.matricule).toBe('PRO-2026-0002');
  });

  it('ignore les coordonnées envoyées en modification par un non-administrateur', async () => {
    prismaMock.proprietaire.findUnique.mockResolvedValue({ id: 'p1' });
    prismaMock.proprietaire.update.mockResolvedValue(fiche);
    await service.update(
      'p1',
      { lastName: 'Diop', email: 'x@ex.sn', phone: '780000000' },
      { roles: ['manager'] },
    );
    expect(prismaMock.proprietaire.update.mock.calls[0][0].data).toEqual({
      lastName: 'Diop',
    });
    await service.update(
      'p1',
      { phone: '780000000' },
      { roles: ['administrateur'] },
    );
    expect(prismaMock.proprietaire.update.mock.calls[1][0].data).toEqual({
      phone: '780000000',
    });
  });
});
