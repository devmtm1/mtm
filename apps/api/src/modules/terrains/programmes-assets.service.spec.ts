import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { createPrismaMock } from '../../../test/helpers/prisma-mock';
import { ProgrammesAssetsService } from './programmes-assets.service';
import { TerrainsAccessService } from './terrains-access.service';

function contexte() {
  const prismaMock = createPrismaMock();
  prismaMock.programmeLotissement.findUnique.mockResolvedValue({ id: 'p1' });
  const cloudinary = {
    upload: jest.fn().mockResolvedValue({
      publicId: 'mtm/programmes/p1/media/x',
      resourceType: 'image',
    }),
    destroy: jest.fn().mockResolvedValue(undefined),
    url: (cle: string) => `https://cdn.test/${cle}`,
  };
  const prisma = prismaMock as unknown as PrismaService;
  const service = new ProgrammesAssetsService(
    prisma,
    cloudinary as unknown as CloudinaryService,
    new TerrainsAccessService(prisma),
  );
  return { prismaMock, cloudinary, service };
}

const direction = { roles: ['direction'], permissions: [] };
const commercial = {
  roles: ['commercial'],
  permissions: ['terrains:modifier'],
};
const image = {
  buffer: Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1,
  ]),
  mimetype: 'image/jpeg',
  size: 10,
  originalname: 'a.jpg',
} as Express.Multer.File;

describe('ProgrammesAssetsService.ajouter', () => {
  it('dépose le visuel en public et le range à la suite des autres', async () => {
    const { prismaMock, cloudinary, service } = contexte();
    prismaMock.programmeMedia.aggregate.mockResolvedValue({
      _max: { sortOrder: 4 },
    });
    prismaMock.programmeMedia.create.mockResolvedValue({ id: 'm1' });
    await service.ajouter(
      'p1',
      { type: 'photo', title: 'Entrée' },
      image,
      direction,
    );
    expect(cloudinary.upload).toHaveBeenCalledWith(
      image,
      'mtm/programmes/p1/media',
      true,
    );
    expect(
      prismaMock.programmeMedia.create.mock.calls[0][0].data,
    ).toMatchObject({
      programmeId: 'p1',
      type: 'photo',
      title: 'Entrée',
      storageKey: 'mtm/programmes/p1/media/x',
      sortOrder: 5,
    });
  });

  it('exige le droit de publier : un visuel du programme est public par nature', async () => {
    const { cloudinary, service } = contexte();
    await expect(
      service.ajouter('p1', { type: 'photo' }, image, commercial),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(cloudinary.upload).not.toHaveBeenCalled();
  });

  it('refuse un fichier qui n’est pas une image', async () => {
    const { service } = contexte();
    await expect(
      service.ajouter(
        'p1',
        { type: 'plan' },
        { ...image, mimetype: 'application/x-msdownload' },
        direction,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse un programme inconnu', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.programmeLotissement.findUnique.mockResolvedValue(null);
    await expect(
      service.ajouter('p1', { type: 'photo' }, image, direction),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ProgrammesAssetsService.definirCouverture', () => {
  it('passe la photo devant toutes les autres', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.programmeMedia.findFirst.mockResolvedValue({
      id: 'm3',
      type: 'photo',
    });
    prismaMock.programmeMedia.aggregate.mockResolvedValue({
      _min: { sortOrder: 1 },
    });
    prismaMock.programmeMedia.update.mockResolvedValue({ id: 'm3' });
    await service.definirCouverture('p1', 'm3');
    expect(prismaMock.programmeMedia.findFirst.mock.calls[0][0].where).toEqual({
      id: 'm3',
      programmeId: 'p1',
      type: 'photo',
    });
    expect(prismaMock.programmeMedia.update.mock.calls[0][0].data).toEqual({
      sortOrder: 0,
    });
  });

  it('un plan de masse ne peut pas servir de couverture', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.programmeMedia.findFirst.mockResolvedValue(null);
    await expect(
      service.definirCouverture('p1', 'plan'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ProgrammesAssetsService.supprimer', () => {
  it('retire le visuel de la base puis du stockage', async () => {
    const { prismaMock, cloudinary, service } = contexte();
    prismaMock.programmeMedia.findFirst.mockResolvedValue({
      id: 'm1',
      storageKey: 'cle',
      resourceType: 'image',
    });
    await service.supprimer('p1', 'm1');
    expect(prismaMock.programmeMedia.delete).toHaveBeenCalledWith({
      where: { id: 'm1' },
    });
    expect(cloudinary.destroy).toHaveBeenCalledWith('cle', 'image', true);
  });

  it('un visuel déjà supprimé ne fait pas d’erreur', async () => {
    const { prismaMock, cloudinary, service } = contexte();
    prismaMock.programmeMedia.findFirst.mockResolvedValue(null);
    await service.supprimer('p1', 'm1');
    expect(cloudinary.destroy).not.toHaveBeenCalled();
  });
});
