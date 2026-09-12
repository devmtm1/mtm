import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { validateUploadedAsset } from '../../common/storage/asset-validation';
import { CreateTerrainAssetDto } from './dto/create-terrain-asset.dto';
import { TerrainsAccessService } from './terrains-access.service';

/**
 * Photos, vidéos, plans et documents justificatifs d'un terrain (J1.1) :
 * dépôt sur Cloudinary et suppression, avec contrôle de publication.
 */
@Injectable()
export class TerrainsAssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly access: TerrainsAccessService,
  ) {}

  async addMedia(
    id: string,
    dto: CreateTerrainAssetDto,
    file: Express.Multer.File,
    user: { roles: string[]; permissions: string[] },
  ) {
    await this.access.ensureAccessible(id, user);
    validateUploadedAsset(file, 'media');
    this.access.assertCanPublish(dto.isPublic, user);
    const uploaded = await this.cloudinary.upload(
      file,
      `mtm/terrains/${id}/media`,
      dto.isPublic ?? false,
    );
    return this.prisma.terrainMedia.create({
      data: {
        terrainId: id,
        type: dto.type,
        title: dto.title,
        isPublic: dto.isPublic ?? false,
        storageKey: uploaded.publicId,
        resourceType: uploaded.resourceType,
      },
    });
  }

  async addDocument(
    id: string,
    dto: CreateTerrainAssetDto,
    file: Express.Multer.File,
    user: { roles: string[]; permissions: string[] },
  ) {
    await this.access.ensureAccessible(id, user);
    validateUploadedAsset(file, 'document');
    this.access.assertCanPublish(dto.isPublic, user);
    const uploaded = await this.cloudinary.upload(
      file,
      `mtm/terrains/${id}/documents`,
      dto.isPublic ?? false,
    );
    return this.prisma.terrainDocument.create({
      data: {
        terrainId: id,
        type: dto.type,
        title: dto.title,
        isPublic: dto.isPublic ?? false,
        storageKey: uploaded.publicId,
        resourceType: uploaded.resourceType,
      },
    });
  }

  async removeMedia(
    id: string,
    mediaId: string,
    user: { roles: string[]; permissions: string[] },
  ): Promise<void> {
    await this.access.ensureAccessible(id, user);
    const media = await this.prisma.terrainMedia.findFirst({
      where: { id: mediaId, terrainId: id },
    });
    if (!media) return;
    await this.prisma.terrainMedia.delete({ where: { id: mediaId } });
    await this.cloudinary.destroy(
      media.storageKey,
      media.resourceType,
      media.isPublic,
    );
  }

  async removeDocument(
    id: string,
    documentId: string,
    user: { roles: string[]; permissions: string[] },
  ): Promise<void> {
    await this.access.ensureAccessible(id, user);
    const document = await this.prisma.terrainDocument.findFirst({
      where: { id: documentId, terrainId: id },
    });
    if (!document) return;
    await this.prisma.terrainDocument.delete({ where: { id: documentId } });
    await this.cloudinary.destroy(
      document.storageKey,
      document.resourceType,
      document.isPublic,
    );
  }
}
