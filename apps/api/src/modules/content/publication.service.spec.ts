import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PublicationService } from './publication.service';

describe('PublicationService', () => {
  const existante = {
    id: 'p1',
    titre: 'Conseil',
    storageKey: null as string | null,
    isActive: false,
    datePublication: null as Date | null,
    tailleOctets: null as number | null,
  };

  function creer(
    options: {
      publication?: Partial<typeof existante> | null;
      info?: Partial<{
        bytes: number;
        duration: number | null;
        format: string | null;
      }>;
    } = {},
  ) {
    const publication = {
      findUnique: jest
        .fn()
        .mockResolvedValue(
          options.publication === null
            ? null
            : { ...existante, ...options.publication },
        ),
      update: jest.fn().mockImplementation(({ data }) => ({ ...existante, ...data })),
      create: jest.fn().mockResolvedValue({ ...existante }),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      delete: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    };
    const prisma = {
      publication,
      $transaction: jest.fn().mockImplementation((action) => action({ publication })),
    };
    const cloudinary = {
      dossier: (dossier: string) => `mtm-prod/${dossier}`,
      videoInfo: jest.fn().mockResolvedValue({
        bytes: 25_000_000,
        duration: 95.4,
        width: 1920,
        height: 1080,
        format: 'mp4',
        ...options.info,
      }),
      videoUrl: jest.fn().mockReturnValue('https://exemple.test/video.mp4'),
      videoPosterUrl: jest.fn().mockReturnValue('https://exemple.test/poster.jpg'),
      destroy: jest.fn().mockResolvedValue(undefined),
      signedUploadParams: jest.fn().mockReturnValue({ signature: 'x' }),
    };
    const service = new PublicationService(prisma as never, cloudinary as never);
    return { prisma, cloudinary, service };
  }

  describe('statut de diffusion', () => {
    const maintenant = new Date('2026-10-21T10:00:00Z');

    it('dit « sans vidéo », « brouillon », « programmée » ou « en ligne »', () => {
      const statut = PublicationService.statut.bind(PublicationService);
      expect(statut({ storageKey: null, isActive: true, datePublication: null }, maintenant)).toBe('sans_video');
      expect(statut({ storageKey: 'v', isActive: false, datePublication: null }, maintenant)).toBe('brouillon');
      expect(statut({ storageKey: 'v', isActive: true, datePublication: new Date('2026-11-01') }, maintenant)).toBe('programmee');
      expect(statut({ storageKey: 'v', isActive: true, datePublication: new Date('2026-10-01') }, maintenant)).toBe('en_ligne');
      expect(statut({ storageKey: 'v', isActive: true, datePublication: null }, maintenant)).toBe('en_ligne');
    });
  });

  describe('publication', () => {
    it('refuse de publier une publication sans vidéo', async () => {
      const { service } = creer();
      await expect(service.setActive('p1', true)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('publie une publication qui a sa vidéo, et la retire sans condition', async () => {
      const { prisma, service } = creer({ publication: { storageKey: 'mtm-prod/mtm/publications/a' } });
      await service.setActive('p1', true);
      expect(prisma.publication.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { isActive: true } });
      await service.setActive('p1', false);
      expect(prisma.publication.update).toHaveBeenLastCalledWith({ where: { id: 'p1' }, data: { isActive: false } });
    });

    it('signale une publication introuvable', async () => {
      const { service } = creer({ publication: null });
      await expect(service.update('absente', { titre: 'x' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('n’a qu’une vidéo à la une : en désigner une retire l’étiquette aux autres', async () => {
      const { prisma, service } = creer();
      await service.update('p1', { misEnAvant: true });
      expect(prisma.publication.updateMany).toHaveBeenCalledWith({
        where: { misEnAvant: true, id: { not: 'p1' } },
        data: { misEnAvant: false },
      });
    });
  });

  describe('vidéo envoyée directement à Cloudinary', () => {
    const idValide = 'mtm-prod/mtm/publications/conseil-titre-foncier';

    it('rattache une vidéo vérifiée et en garde les caractéristiques', async () => {
      const { prisma, service } = creer();
      const resultat = await service.attacherVideo('p1', { publicId: idValide });
      expect(prisma.publication.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: {
          storageKey: idValide,
          dureeSecondes: 95,
          largeur: 1920,
          hauteur: 1080,
          tailleOctets: 25_000_000,
        },
      });
      expect(resultat.statut).toBe('brouillon');
    });

    it('refuse une vidéo qui ne vient pas du dossier des publications', async () => {
      const { cloudinary, service } = creer();
      await expect(
        service.attacherVideo('p1', { publicId: 'mtm-prod/mtm/terrains/une-photo' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(cloudinary.videoInfo).not.toHaveBeenCalled();
    });

    it('refuse un format que le navigateur ne sait pas lire, une vidéo vide ou trop longue', async () => {
      await expect(creer({ info: { format: 'avi' } }).service.attacherVideo('p1', { publicId: idValide })).rejects.toBeInstanceOf(BadRequestException);
      await expect(creer({ info: { bytes: 0 } }).service.attacherVideo('p1', { publicId: idValide })).rejects.toBeInstanceOf(BadRequestException);
      await expect(creer({ info: { duration: 21 * 60 } }).service.attacherVideo('p1', { publicId: idValide })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('remplace l’ancienne vidéo : elle est supprimée de Cloudinary', async () => {
      const { cloudinary, service } = creer({ publication: { storageKey: 'mtm-prod/mtm/publications/ancienne' } });
      await service.attacherVideo('p1', { publicId: idValide });
      expect(cloudinary.destroy).toHaveBeenCalledWith('mtm-prod/mtm/publications/ancienne', 'video', true);
    });

    it('supprime aussi la vidéo de Cloudinary quand on supprime la publication', async () => {
      const { prisma, cloudinary, service } = creer({ publication: { storageKey: 'mtm-prod/mtm/publications/a' } });
      await service.remove('p1');
      expect(prisma.publication.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
      expect(cloudinary.destroy).toHaveBeenCalledWith('mtm-prod/mtm/publications/a', 'video', true);
    });
  });
});
