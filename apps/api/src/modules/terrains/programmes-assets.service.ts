import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { validateUploadedAsset } from '../../common/storage/asset-validation';
import { TerrainsAccessService } from './terrains-access.service';

type Utilisateur = { roles: string[]; permissions: string[] };

const ordre = [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }];

/**
 * Les visuels d'un programme pour le site public : photos (la première est la couverture) et plan
 * de masse. Ils sont publics par nature : les déposer demande le droit de publier.
 */
@Injectable()
export class ProgrammesAssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly access: TerrainsAccessService,
  ) {}

  private async assertExiste(id: string) {
    const trouve = await this.prisma.programmeLotissement.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!trouve) throw new NotFoundException('Programme introuvable');
  }

  async lister(programmeId: string) {
    await this.assertExiste(programmeId);
    const medias = await this.prisma.programmeMedia.findMany({
      where: { programmeId },
      orderBy: ordre,
    });
    return medias.map((m) => ({
      id: m.id,
      type: m.type,
      title: m.title,
      sortOrder: m.sortOrder,
      secureUrl: this.cloudinary.url(m.storageKey, m.resourceType, true),
    }));
  }

  async ajouter(
    programmeId: string,
    dto: { type: 'photo' | 'plan'; title?: string },
    file: Express.Multer.File,
    user: Utilisateur,
  ) {
    await this.assertExiste(programmeId);
    validateUploadedAsset(file, 'media');
    this.access.assertCanPublish(true, user);
    const envoye = await this.cloudinary.upload(
      file,
      `mtm/programmes/${programmeId}/media`,
      true,
    );
    const dernier = await this.prisma.programmeMedia.aggregate({
      where: { programmeId },
      _max: { sortOrder: true },
    });
    return this.prisma.programmeMedia.create({
      data: {
        programmeId,
        type: dto.type,
        title: dto.title,
        storageKey: envoye.publicId,
        resourceType: envoye.resourceType,
        sortOrder: (dernier._max.sortOrder ?? 0) + 1,
      },
    });
  }

  /** Passe la photo en tête : c'est elle que montrent la carte du catalogue et l'en-tête de la page. */
  async definirCouverture(programmeId: string, mediaId: string) {
    const media = await this.prisma.programmeMedia.findFirst({
      where: { id: mediaId, programmeId, type: 'photo' },
    });
    if (!media) throw new NotFoundException('Photo introuvable');
    const premier = await this.prisma.programmeMedia.aggregate({
      where: { programmeId },
      _min: { sortOrder: true },
    });
    return this.prisma.programmeMedia.update({
      where: { id: mediaId },
      data: { sortOrder: (premier._min.sortOrder ?? 0) - 1 },
    });
  }

  async supprimer(programmeId: string, mediaId: string): Promise<void> {
    const media = await this.prisma.programmeMedia.findFirst({
      where: { id: mediaId, programmeId },
    });
    if (!media) return;
    await this.prisma.programmeMedia.delete({ where: { id: mediaId } });
    await this.cloudinary.destroy(media.storageKey, media.resourceType, true);
  }
}
