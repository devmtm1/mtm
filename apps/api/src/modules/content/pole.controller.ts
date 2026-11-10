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
import { PoleService } from './pole.service';
import { CreatePoleDto } from './dto/create-pole.dto';
import { UpdatePoleDto } from './dto/update-pole.dto';
import { PublishContentBlockDto } from './dto/publish-content-block.dto';

/** Pôles d'activité de MTM : la page « Nos services » et l'accueil du site public les lisent ici. */
@ApiTags('poles')
@Controller('poles')
export class PoleController {
  constructor(
    private readonly poles: PoleService,
    private readonly audit: AuditService,
  ) {}

  @Public()
  @PublicCache()
  @Get()
  findPublic() {
    return this.poles.findPublic();
  }

  @Get('admin')
  @RequirePermissions('content:consulter')
  findAllAdmin() {
    return this.poles.findAllAdmin();
  }

  @Post()
  @RequirePermissions('content:creer')
  async create(
    @Body() dto: CreatePoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const pole = await this.poles.create(dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'pole.created',
      entityType: 'Pole',
      entityId: pole.id,
      newValue: { nom: pole.nom },
    });
    return pole;
  }

  @Patch(':id')
  @RequirePermissions('content:modifier')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const pole = await this.poles.update(id, dto);
    await this.audit.record({
      userId: user.id,
      action: 'pole.updated',
      entityType: 'Pole',
      entityId: id,
      newValue: dto,
    });
    return pole;
  }

  @Patch(':id/publish')
  @RequirePermissions('content:publier')
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishContentBlockDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const pole = await this.poles.setActive(id, dto.isActive);
    await this.audit.record({
      userId: user.id,
      action: dto.isActive ? 'pole.published' : 'pole.unpublished',
      entityType: 'Pole',
      entityId: id,
    });
    return pole;
  }

  @Post(':id/image')
  @RequirePermissions('content:modifier')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_ASSET_SIZE } }),
  )
  async uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Une image est obligatoire');
    const pole = await this.poles.uploadImage(id, file);
    await this.audit.record({
      userId: user.id,
      action: 'pole.image.updated',
      entityType: 'Pole',
      entityId: id,
    });
    return pole;
  }

  @Delete(':id')
  @RequirePermissions('content:supprimer')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.poles.remove(id);
    await this.audit.record({
      userId: user.id,
      action: 'pole.deleted',
      entityType: 'Pole',
      entityId: id,
    });
    return { success: true };
  }
}
