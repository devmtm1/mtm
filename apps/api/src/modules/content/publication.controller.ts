import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { PublicCache } from '../../common/http/public-cache.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { PublicationService } from './publication.service';
import {
  AttacherVideoDto,
  CreatePublicationDto,
  UpdatePublicationDto,
} from './dto/publication.dto';
import { PublishContentBlockDto } from './dto/publish-content-block.dto';

/** Vidéos de la page « Actualités et conseils » du site public. */
@ApiTags('publications')
@Controller('publications')
export class PublicationController {
  constructor(
    private readonly publications: PublicationService,
    private readonly audit: AuditService,
  ) {}

  /** Les vidéos en ligne : la page publique du site les affiche. */
  @Public()
  @PublicCache()
  @Get()
  findPublic() {
    return this.publications.findPublic();
  }

  @Get('admin')
  @RequirePermissions('content:consulter')
  findAllAdmin() {
    return this.publications.findAllAdmin();
  }

  /** Autorisation signée : le navigateur envoie la vidéo directement à Cloudinary. */
  @Post('autorisation-envoi')
  @RequirePermissions('content:modifier')
  autorisationEnvoi() {
    return this.publications.autorisationEnvoi();
  }

  @Post()
  @RequirePermissions('content:creer')
  async create(
    @Body() dto: CreatePublicationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const publication = await this.publications.create(dto);
    await this.audit.record({
      userId: user.id,
      action: 'publication.created',
      entityType: 'Publication',
      entityId: publication.id,
      newValue: { titre: publication.titre },
    });
    return publication;
  }

  @Patch(':id')
  @RequirePermissions('content:modifier')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePublicationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const publication = await this.publications.update(id, dto);
    await this.audit.record({
      userId: user.id,
      action: 'publication.updated',
      entityType: 'Publication',
      entityId: id,
      newValue: dto,
    });
    return publication;
  }

  @Patch(':id/publish')
  @RequirePermissions('content:publier')
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishContentBlockDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const publication = await this.publications.setActive(id, dto.isActive);
    await this.audit.record({
      userId: user.id,
      action: dto.isActive ? 'publication.published' : 'publication.unpublished',
      entityType: 'Publication',
      entityId: id,
    });
    return publication;
  }

  /** Rattache à la publication la vidéo que le navigateur vient d'envoyer à Cloudinary. */
  @Post(':id/video')
  @RequirePermissions('content:modifier')
  async attacherVideo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AttacherVideoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const publication = await this.publications.attacherVideo(id, dto);
    await this.audit.record({
      userId: user.id,
      action: 'publication.video.updated',
      entityType: 'Publication',
      entityId: id,
      newValue: {
        dureeSecondes: publication.dureeSecondes,
        tailleOctets: publication.tailleOctets,
      },
    });
    return publication;
  }

  @Delete(':id')
  @RequirePermissions('content:supprimer')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.publications.remove(id);
    await this.audit.record({
      userId: user.id,
      action: 'publication.deleted',
      entityType: 'Publication',
      entityId: id,
    });
    return { success: true };
  }
}
