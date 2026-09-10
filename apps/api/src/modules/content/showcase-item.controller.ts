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
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { ShowcaseItemService } from './showcase-item.service';
import { CreateShowcaseItemDto } from './dto/create-showcase-item.dto';
import { UpdateShowcaseItemDto } from './dto/update-showcase-item.dto';
import { PublishContentBlockDto } from './dto/publish-content-block.dto';

@ApiTags('showcase')
@Controller('showcase')
export class ShowcaseItemController {
  constructor(
    private readonly showcase: ShowcaseItemService,
    private readonly audit: AuditService,
  ) {}

  @Public()
  @Get()
  findAll(@Query('category') category?: string) {
    return this.showcase.findAll(category);
  }

  @Get('admin')
  @RequirePermissions('content:consulter')
  findAllAdmin() {
    return this.showcase.findAllAdmin();
  }

  @Post()
  @RequirePermissions('content:creer')
  async create(
    @Body() dto: CreateShowcaseItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const item = await this.showcase.create(dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'showcase.created',
      entityType: 'ShowcaseItem',
      entityId: item.id,
      newValue: { category: item.category, title: item.title },
    });
    return item;
  }

  @Patch(':id')
  @RequirePermissions('content:modifier')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShowcaseItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const item = await this.showcase.update(id, dto);
    await this.audit.record({
      userId: user.id,
      action: 'showcase.updated',
      entityType: 'ShowcaseItem',
      entityId: id,
      newValue: dto,
    });
    return item;
  }

  @Patch(':id/publish')
  @RequirePermissions('content:publier')
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishContentBlockDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const item = await this.showcase.setActive(id, dto.isActive);
    await this.audit.record({
      userId: user.id,
      action: dto.isActive ? 'showcase.published' : 'showcase.unpublished',
      entityType: 'ShowcaseItem',
      entityId: id,
    });
    return item;
  }

  @Post(':id/image')
  @RequirePermissions('content:modifier')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Une image est obligatoire');
    const item = await this.showcase.uploadImage(id, file);
    await this.audit.record({
      userId: user.id,
      action: 'showcase.image.updated',
      entityType: 'ShowcaseItem',
      entityId: id,
    });
    return item;
  }

  @Delete(':id')
  @RequirePermissions('content:supprimer')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.showcase.remove(id);
    await this.audit.record({
      userId: user.id,
      action: 'showcase.deleted',
      entityType: 'ShowcaseItem',
      entityId: id,
    });
    return { success: true };
  }
}
