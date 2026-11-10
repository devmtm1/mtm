import { NotFoundException } from '@nestjs/common';
import { PoleService, slugDe } from './pole.service';

const ligne = (surcharge: Record<string, unknown> = {}) => ({
  id: 'p1',
  slug: 'mtm-clean',
  nom: 'MTM Clean',
  accroche: 'Nettoyage et entretien',
  description: 'Nettoyage de maisons',
  points: ['Maisons', 'Bureaux'],
  storageKey: null,
  resourceType: 'image',
  imageDefaut: '/poles/clean.jpg',
  lienUrl: '/contact',
  libelleLien: 'Nous contacter',
  ordre: 1,
  surAccueil: true,
  lies: ['maintenance'],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...surcharge,
});

function montage(lignes: unknown[] = [ligne()]) {
  const prisma = {
    pole: {
      findMany: jest.fn().mockResolvedValue(lignes),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => ({
        ...ligne(),
        ...data,
      })),
      update: jest.fn().mockImplementation(({ data }) => ({
        ...ligne(),
        ...data,
      })),
    },
  };
  const cloudinary = {
    url: jest.fn().mockReturnValue('https://cdn.test/clean.jpg'),
    destroy: jest.fn(),
  };
  return {
    prisma,
    cloudinary,
    service: new PoleService(prisma as never, cloudinary as never),
  };
}

describe('slugDe', () => {
  it('donne une ancre lisible, sans accent ni symbole', () => {
    expect(slugDe('MTM Clean')).toBe('mtm-clean');
    expect(slugDe('MTM BTP, Architecture & Topographie')).toBe(
      'mtm-btp-architecture-topographie',
    );
    expect(slugDe('Pôle Éclair !')).toBe('pole-eclair');
  });
});

describe('PoleService', () => {
  it('publie les pôles actifs numérotés dans l’ordre, sans aucun identifiant de stockage', async () => {
    const { service } = montage([
      ligne(),
      ligne({ id: 'p2', slug: 'gestion', nom: 'MTM Gestion' }),
    ]);
    const poles = await service.findPublic();
    expect(poles.map((p) => p.numero)).toEqual(['01', '02']);
    expect(poles[0]).not.toHaveProperty('storageKey');
    expect(poles[0].points).toEqual(['Maisons', 'Bureaux']);
  });

  it('indique si le pôle est montré sur l’accueil et quels pôles lui sont liés', async () => {
    const { service } = montage();
    const [pole] = await service.findPublic();
    expect(pole.surAccueil).toBe(true);
    expect(pole.lies).toEqual(['maintenance']);
  });

  it('demande à la base uniquement les pôles actifs', async () => {
    const { service, prisma } = montage();
    await service.findPublic();
    expect(prisma.pole.findMany.mock.calls[0][0].where).toEqual({
      isActive: true,
    });
  });

  it('préfère la photo envoyée à celle fournie avec le site', async () => {
    const { service } = montage([ligne({ storageKey: 'mtm/poles/x' })]);
    expect((await service.findPublic())[0].imageUrl).toBe(
      'https://cdn.test/clean.jpg',
    );
  });

  it('retombe sur la photo du site tant qu’aucune n’est envoyée', async () => {
    const { service } = montage();
    expect((await service.findPublic())[0].imageUrl).toBe('/poles/clean.jpg');
  });

  it('crée un pôle masqué sans le droit de publier, avec des puces nettoyées', async () => {
    const { service, prisma } = montage();
    await service.create(
      { nom: ' MTM Clean ', points: [' Maisons ', '', '  '], isActive: true },
      { roles: ['conseiller'], permissions: ['content:creer'] },
    );
    const data = prisma.pole.create.mock.calls[0][0].data;
    expect(data.isActive).toBe(false);
    expect(data.points).toEqual(['Maisons']);
    expect(data.nom).toBe('MTM Clean');
    expect(data.slug).toBe('mtm-clean');
  });

  it('numérote l’ancre quand elle existe déjà', async () => {
    const { service, prisma } = montage();
    prisma.pole.findUnique
      .mockResolvedValueOnce({ id: 'autre' })
      .mockResolvedValueOnce(null);
    await service.create(
      { nom: 'MTM Clean' },
      { roles: [], permissions: ['content:creer'] },
    );
    expect(prisma.pole.create.mock.calls[0][0].data.slug).toBe('mtm-clean-2');
  });

  it('efface un champ vidé au lieu de laisser un blanc', async () => {
    const { service, prisma } = montage();
    prisma.pole.findUnique.mockResolvedValue(ligne());
    await service.update('p1', { accroche: '   ', libelleLien: '' });
    const data = prisma.pole.update.mock.calls[0][0].data;
    expect(data.accroche).toBeNull();
    expect(data.libelleLien).toBeNull();
  });

  it('refuse de modifier un pôle inconnu', async () => {
    const { service } = montage();
    await expect(service.update('absent', { nom: 'X' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
