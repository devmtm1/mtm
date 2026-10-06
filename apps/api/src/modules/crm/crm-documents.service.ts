import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { hasAnyRole, PUBLISHER_ROLES } from '../rbac/role-groups';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { validateUploadedAsset } from '../../common/storage/asset-validation';
import { CreateDocumentCrmDto } from './dto/create-document-crm.dto';
import { CrmAccessService, type CrmUser } from './crm-access.service';
import { CrmOptionsService } from './crm-options.service';

/** Documents rattachés à un prospect (GED de base, section 17 CDC). */
@Injectable()
export class CrmDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly access: CrmAccessService,
    private readonly options: CrmOptionsService,
  ) {}

  async addDocument(
    prospectId: string,
    dto: CreateDocumentCrmDto,
    file: Express.Multer.File,
    user: { id: string; roles: string[]; permissions: string[] },
  ) {
    await this.access.assertOwnership(prospectId, user);
    validateUploadedAsset(file, 'document');
    if (
      dto.isPublic &&
      !hasAnyRole(user.roles, PUBLISHER_ROLES) &&
      !user.permissions.includes('crm:publier')
    ) {
      throw new BadRequestException(
        'La publication nécessite la permission crm:publier',
      );
    }
    await this.options.assertDocumentType(dto.type);
    const uploaded = await this.cloudinary.upload(
      file,
      `mtm/crm/${prospectId}/documents`,
      dto.isPublic ?? false,
    );
    // Même objet, même type, même titre : c'est une nouvelle version du document.
    const version =
      ((
        await this.prisma.documentCrm.aggregate({
          where: {
            prospectId: prospectId,
            type: dto.type,
            title: dto.title ?? null,
          },
          _max: { version: true },
        })
      )._max.version ?? 0) + 1;
    return this.prisma.documentCrm.create({
      data: {
        prospectId,
        type: dto.type,
        title: dto.title,
        version,
        isPublic: dto.isPublic ?? false,
        storageKey: uploaded.publicId,
        resourceType: uploaded.resourceType,
        url: uploaded.secureUrl,
      },
    });
  }

  async removeDocument(
    prospectId: string,
    documentId: string,
    user: CrmUser,
  ): Promise<void> {
    await this.access.assertOwnership(prospectId, user);
    const document = await this.prisma.documentCrm.findFirst({
      where: { id: documentId, prospectId },
    });
    if (!document) return;
    await this.prisma.documentCrm.delete({ where: { id: documentId } });
    await this.cloudinary.destroy(
      document.storageKey,
      document.resourceType,
      document.isPublic,
    );
  }
}
