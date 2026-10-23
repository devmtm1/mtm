import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { ContentBlockService } from './content-block.service';

describe('ContentBlockService public contract', () => {
  let service: ContentBlockService;
  let prismaMock: {
    contentBlock: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
    };
  };
  let cloudinaryMock: { upload: jest.Mock; destroy: jest.Mock };

  beforeEach(() => {
    prismaMock = {
      contentBlock: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };
    cloudinaryMock = {
      upload: jest.fn().mockResolvedValue({
        publicId: 'mtm-prod/mtm/pages/nouveau',
        resourceType: 'image',
        secureUrl:
          'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1/mtm-prod/mtm/pages/nouveau',
      }),
      destroy: jest.fn().mockResolvedValue(undefined),
    };
    const auditMock = { record: jest.fn().mockResolvedValue(undefined) };
    service = new ContentBlockService(
      prismaMock as unknown as PrismaService,
      auditMock as unknown as AuditService,
      cloudinaryMock as unknown as CloudinaryService,
    );
  });

  it('ne retourne que les contenus actifs et les champs publics', async () => {
    prismaMock.contentBlock.findMany.mockResolvedValue([]);

    await service.findAll();

    expect(prismaMock.contentBlock.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      select: { key: true, title: true, content: true, type: true },
      orderBy: [{ type: 'asc' }, { ordre: 'asc' }],
    });
  });

  it('exclut un contenu désactivé lors de la recherche par clé', async () => {
    prismaMock.contentBlock.findUnique.mockResolvedValue(null);

    await expect(service.findByKey('home.hero.title')).rejects.toThrow(
      NotFoundException,
    );
    expect(prismaMock.contentBlock.findUnique).toHaveBeenCalledWith({
      where: { key: 'home.hero.title', isActive: true },
      select: { key: true, title: true, content: true, type: true },
    });
  });

  it('publie ou dépublie un contenu avec traçabilité de l’éditeur', async () => {
    prismaMock.contentBlock.findUnique.mockResolvedValue({ key: 'home.hero' });
    prismaMock.contentBlock.update.mockResolvedValue({
      key: 'home.hero',
      isActive: true,
    });

    await service.setActive('home.hero', true, 'user-1');

    expect(prismaMock.contentBlock.update).toHaveBeenCalledWith({
      where: { key: 'home.hero' },
      data: { isActive: true, updatedById: 'user-1' },
    });
  });

  describe('image d’un emplacement du site', () => {
    const redacteur = { id: 'u1', roles: ['administrateur'], permissions: [] };
    const fichier = (type = 'image/jpeg') =>
      ({
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]),
        mimetype: type,
        size: 8,
      }) as unknown as Express.Multer.File;

    it('crée le bloc avec l’adresse de l’image envoyée', async () => {
      prismaMock.contentBlock.findUnique.mockResolvedValue(null);
      prismaMock.contentBlock.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'b1', ...data }),
      );
      const bloc = await service.uploadImage(
        'realisations.image',
        fichier(),
        redacteur,
      );
      expect(cloudinaryMock.upload).toHaveBeenCalledWith(
        expect.anything(),
        'mtm/pages',
        true,
      );
      expect(bloc.content).toContain('res.cloudinary.com');
      expect(prismaMock.contentBlock.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          key: 'realisations.image',
          isActive: true,
        }),
      });
    });

    it('remplace l’image et supprime l’ancienne de Cloudinary', async () => {
      prismaMock.contentBlock.findUnique.mockResolvedValue({
        id: 'b1',
        key: 'realisations.image',
        content:
          'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1/mtm-prod/mtm/pages/ancienne',
      });
      prismaMock.contentBlock.update.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'b1', ...data }),
      );
      await service.uploadImage('realisations.image', fichier(), redacteur);
      expect(cloudinaryMock.destroy).toHaveBeenCalledWith(
        'mtm-prod/mtm/pages/ancienne',
        'image',
        true,
      );
    });

    it('refuse un fichier qui n’est pas une image', async () => {
      const pdf = {
        buffer: Buffer.from('%PDF-1.4'),
        mimetype: 'video/mp4',
        size: 8,
      } as unknown as Express.Multer.File;
      await expect(
        service.uploadImage('realisations.image', pdf, redacteur),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(cloudinaryMock.upload).not.toHaveBeenCalled();
    });

    it('refuse un nom d’emplacement douteux', async () => {
      await expect(
        service.uploadImage('../secret', fichier(), redacteur),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('supprime aussi l’image de Cloudinary quand le bloc est supprimé', async () => {
      prismaMock.contentBlock.findUnique.mockResolvedValue({
        id: 'b1',
        key: 'realisations.image',
        content:
          'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1/mtm-prod/mtm/pages/ancienne',
      });
      (prismaMock.contentBlock as unknown as { delete: jest.Mock }).delete =
        jest.fn().mockResolvedValue({});
      await service.remove('realisations.image', 'u1');
      expect(cloudinaryMock.destroy).toHaveBeenCalledWith(
        'mtm-prod/mtm/pages/ancienne',
        'image',
        true,
      );
    });
  });
});
