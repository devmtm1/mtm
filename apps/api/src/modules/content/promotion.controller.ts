import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { MAX_ASSET_SIZE } from '../../common/storage/asset-validation';
import { Public } from '../auth/decorators/public.decorator';
import { PublicCache } from '../../common/http/public-cache.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { PromotionService } from './promotion.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { PublishContentBlockDto } from './dto/publish-content-block.dto';

/** Publicités et promotions du bandeau d'accueil du site public. */
@ApiTags('promotions')
@Controller('promotions')
export class PromotionController {
  constructor(
    private readonly promotions: PromotionService,
    private readonly audit: AuditService,
  ) {}

  /** Promotions en ligne, dans l'ordre d'affichage : le site les montre à la place de sa vidéo. */
  @Public()
  @PublicCache()
  @Get()
  findPublic() {
    return this.promotions.findPublic();
  }

  @Get('admin')
  @RequirePermissions('content:consulter')
  findAllAdmin() {
    return this.promotions.findAllAdmin();
  }

  @Post()
  @RequirePermissions('content:creer')
  async create(
    @Body() dto: CreatePromotionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const promotion = await this.promotions.create(dto);
    await this.audit.record({
      userId: user.id,
      action: 'promotion.created',
      entityType: 'Promotion',
      entityId: promotion.id,
      newValue: { titre: promotion.titre },
    });
    return promotion;
  }

  @Patch(':id')
  @RequirePermissions('content:modifier')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromotionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const promotion = await this.promotions.update(id, dto);
    await this.audit.record({
      userId: user.id,
      action: 'promotion.updated',
      entityType: 'Promotion',
      entityId: id,
      newValue: dto,
    });
    return promotion;
  }

  @Patch(':id/publish')
  @RequirePermissions('content:publier')
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishContentBlockDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const promotion = await this.promotions.setActive(id, dto.isActive);
    await this.audit.record({
      userId: user.id,
      action: dto.isActive ? 'promotion.published' : 'promotion.unpublished',
      entityType: 'Promotion',
      entityId: id,
    });
    return promotion;
  }

  @Post(':id/media')
  @RequirePermissions('content:modifier')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_ASSET_SIZE } }),
  )
  async uploadMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('Une image ou une vidéo est obligatoire');
    }
    const promotion = await this.promotions.uploadMedia(id, file);
    await this.audit.record({
      userId: user.id,
      action: 'promotion.media.updated',
      entityType: 'Promotion',
      entityId: id,
      newValue: { type: promotion.resourceType },
    });
    return promotion;
  }

  @Delete(':id')
  @RequirePermissions('content:supprimer')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.promotions.remove(id);
    await this.audit.record({
      userId: user.id,
      action: 'promotion.deleted',
      entityType: 'Promotion',
      entityId: id,
    });
    return { success: true };
  }
}
