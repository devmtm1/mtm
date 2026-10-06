import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { validateUploadedAsset } from '../../common/storage/asset-validation';
import {
  LocatifAccessService,
  type LocatifUser,
} from './locatif-access.service';
import { CreateBienMediaDto } from './dto/annonce.dto';

/** Au-delà, la galerie devient illisible et la page lourde pour un téléphone. */
export const MAX_MEDIAS_PAR_BIEN = 20;

interface MediaLigne {
  id: string;
  type: string;
  title: string | null;
  sortOrder: number;
  storageKey: string;
  resourceType: string;
  createdAt: Date;
}

/**
 * Photos et vidéos d'annonce d'un bien en location : dépôt, suppression, ordre.
 * Elles sont publiques par nature (l'annonce est faite pour être vue) ; les
 * pièces privées du bien — bail, état des lieux — sont des documents à part.
 */
@Injectable()
export class BienMediasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly access: LocatifAccessService,
  ) {}

  /** Ajoute `secureUrl` à chaque média, pour l'affichage au back-office. */
  withUrls<T extends { medias?: MediaLigne[] }>(bien: T) {
    return {
      ...bien,
      medias: (bien.medias ?? []).map((media) => ({
        id: media.id,
        type: media.type,
        title: media.title,
        sortOrder: media.sortOrder,
        createdAt: media.createdAt,
        secureUrl: this.cloudinary.url(
          media.storageKey,
          media.resourceType,
          true,
        ),
      })),
    };
  }

  async add(
    bienId: string,
    dto: CreateBienMediaDto,
    file: Express.Multer.File | undefined,
    user: LocatifUser,
  ) {
    await this.access.ensureBienAccessible(bienId, user);
    if (!file) throw new BadRequestException('Un fichier est obligatoire');
    validateUploadedAsset(file, 'media');

    const existants = await this.prisma.bienLocatifMedia.aggregate({
      where: { bienLocatifId: bienId },
      _count: true,
      _max: { sortOrder: true },
    });
    if (existants._count >= MAX_MEDIAS_PAR_BIEN) {
      throw new BadRequestException(
        `Un bien ne peut pas avoir plus de ${MAX_MEDIAS_PAR_BIEN} photos ou vidéos.`,
      );
    }

    const uploaded = await this.cloudinary.upload(
      file,
      `mtm/locations/${bienId}`,
      true,
    );
    return this.prisma.bienLocatifMedia.create({
      data: {
        bienLocatifId: bienId,
        type: file.mimetype.startsWith('video/') ? 'video' : 'photo',
        title: dto.title?.trim() || null,
        storageKey: uploaded.publicId,
        resourceType: uploaded.resourceType,
        sortOrder: (existants._max.sortOrder ?? -1) + 1,
      },
    });
  }

  async remove(
    bienId: string,
    mediaId: string,
    user: LocatifUser,
  ): Promise<void> {
    await this.access.ensureBienAccessible(bienId, user);
    const media = await this.prisma.bienLocatifMedia.findFirst({
      where: { id: mediaId, bienLocatifId: bienId },
      include: {
        bienLocatif: {
          select: { publie: true, _count: { select: { medias: true } } },
        },
      },
    });
    if (!media) throw new NotFoundException('Média introuvable');
    // Retirer la dernière photo d'une annonce publiée la laisserait sans visuel.
    if (media.bienLocatif.publie && media.bienLocatif._count.medias <= 1) {
      throw new BadRequestException(
        'Retirez l’annonce du site avant de supprimer sa dernière photo.',
      );
    }
    await this.prisma.bienLocatifMedia.delete({ where: { id: mediaId } });
    await this.cloudinary.destroy(media.storageKey, media.resourceType, true);
  }

  /** La première photo de la liste devient la couverture de l'annonce. */
  async reorder(bienId: string, ids: string[], user: LocatifUser) {
    await this.access.ensureBienAccessible(bienId, user);
    const medias = await this.prisma.bienLocatifMedia.findMany({
      where: { bienLocatifId: bienId },
      select: { id: true },
    });
    const connus = new Set(medias.map((media) => media.id));
    if (
      ids.length !== connus.size ||
      new Set(ids).size !== ids.length ||
      ids.some((id) => !connus.has(id))
    ) {
      throw new BadRequestException(
        'La liste doit contenir exactement les médias du bien, une fois chacun.',
      );
    }
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.bienLocatifMedia.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
    return { success: true };
  }
}
