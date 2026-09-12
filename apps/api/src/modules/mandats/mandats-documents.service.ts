import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { hasAnyRole, PUBLISHER_ROLES } from '../rbac/role-groups';
import { SettingsService } from '../settings/settings.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { validateUploadedAsset } from '../../common/storage/asset-validation';
import { CreateMandatDocumentDto } from './dto/create-mandat-document.dto';
import {
  MandatsAccessService,
  type MandatUser,
} from './mandats-access.service';
import { DEFAULT_MANDAT_OPTIONS } from './mandats-defaults';

/**
 * Documents d'un mandat (contrat, avenants, preuves de signature,
 * correspondances — section 10 CDC) et historique d'audit du mandat.
 */
@Injectable()
export class MandatsDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly settings: SettingsService,
    private readonly access: MandatsAccessService,
  ) {}

  async addDocument(
    mandatId: string,
    dto: CreateMandatDocumentDto,
    file: Express.Multer.File,
    user: MandatUser,
  ) {
    await this.access.ensureAccessible(mandatId, user);
    validateUploadedAsset(file, 'document');
    if (
      dto.isPublic &&
      !hasAnyRole(user.roles, PUBLISHER_ROLES) &&
      !user.permissions.includes('mandats:publier')
    ) {
      throw new BadRequestException(
        'La publication nécessite la permission mandats:publier',
      );
    }
    await this.validateDocumentType(dto.type);
    const uploaded = await this.cloudinary.upload(
      file,
      `mtm/mandats/${mandatId}/documents`,
      dto.isPublic ?? false,
    );
    return this.prisma.mandatDocument.create({
      data: {
        mandatId,
        type: dto.type,
        title: dto.title,
        isPublic: dto.isPublic ?? false,
        storageKey: uploaded.publicId,
        resourceType: uploaded.resourceType,
      },
    });
  }

  async removeDocument(
    mandatId: string,
    documentId: string,
    user: MandatUser,
  ): Promise<void> {
    await this.access.ensureAccessible(mandatId, user);
    const document = await this.prisma.mandatDocument.findFirst({
      where: { id: documentId, mandatId },
    });
    if (!document) return;
    await this.prisma.mandatDocument.delete({ where: { id: documentId } });
    await this.cloudinary.destroy(
      document.storageKey,
      document.resourceType,
      document.isPublic,
    );
  }

  async getHistory(mandatId: string, user: MandatUser) {
    await this.access.ensureAccessible(mandatId, user);
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { entityType: 'Mandat', entityId: mandatId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.auditLog.count({
        where: { entityType: 'Mandat', entityId: mandatId },
      }),
    ]);
    return { items, total };
  }

  private validateDocumentType(type: string): Promise<void> {
    return this.settings.assertInList(
      'mandats.documentTypes',
      DEFAULT_MANDAT_OPTIONS.documentTypes,
      type,
      'Type de document invalide',
    );
  }
}
