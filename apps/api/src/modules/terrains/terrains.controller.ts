import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { CreateTerrainDto } from './dto/create-terrain.dto';
import { QueryTerrainDto } from './dto/query-terrain.dto';
import { UpdateTerrainDto } from './dto/update-terrain.dto';
import { UpdateTerrainStatusDto } from './dto/update-terrain-status.dto';
import { CreateTerrainAssetDto } from './dto/create-terrain-asset.dto';
import { TerrainsService } from './terrains.service';

@ApiTags('terrains')
@Controller('terrains')
export class TerrainsController {
  constructor(
    private readonly terrains: TerrainsService,
    private readonly audit: AuditService,
  ) {}

  @Public()
  @Get('public')
  findPublic(@Query() query: QueryTerrainDto) {
    return this.terrains.findPublic(query);
  }

  @Public()
  @Get('public/:id')
  findPublicOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.terrains.findPublicOne(id);
  }

  @Get() @RequirePermissions('terrains:consulter') findAll(
    @Query() query: QueryTerrainDto,
  ) {
    return this.terrains.findAll(query);
  }

  @Get('options') @RequirePermissions('terrains:consulter') getOptions() {
    return this.terrains.getOptions();
  }

  @Get(':id') @RequirePermissions('terrains:consulter') findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.terrains.findOne(id);
  }

  @Post() @RequirePermissions('terrains:creer') async create(
    @Body() dto: CreateTerrainDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const terrain = await this.terrains.create(dto);
    await this.audit.record({
      userId: user.id,
      action: 'terrain.created',
      entityType: 'Terrain',
      entityId: terrain.id,
      newValue: terrain,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return terrain;
  }

  @Patch(':id') @RequirePermissions('terrains:modifier') async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTerrainDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const before = await this.terrains.findOne(id);
    const terrain = await this.terrains.update(id, dto);
    await this.audit.record({
      userId: user.id,
      action: 'terrain.updated',
      entityType: 'Terrain',
      entityId: id,
      oldValue: before,
      newValue: terrain,
      justification: dto.justification,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return terrain;
  }

  @Patch(':id/juridical-status')
  @RequirePermissions('terrains:valider')
  updateJuridical(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTerrainStatusDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.updateStatus(id, 'statutJuridique', dto.value, dto.justification, user, req);
  }
  @Patch(':id/verification-status')
  @RequirePermissions('terrains:valider')
  updateVerification(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTerrainStatusDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.updateStatus(id, 'niveauVerification', dto.value, dto.justification, user, req);
  }
  @Patch(':id/commercial-status')
  @RequirePermissions('terrains:modifier')
  updateCommercial(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTerrainStatusDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.updateStatus(id, 'statutCommercial', dto.value, dto.justification, user, req);
  }

  private async updateStatus(
    id: string,
    field: 'statutJuridique' | 'niveauVerification' | 'statutCommercial',
    value: string,
    justification: string | undefined,
    user: AuthenticatedUser,
    req: Request,
  ) {
    const before = await this.terrains.findOne(id);
    const terrain = await this.terrains.updateStatus(id, field, value);
    await this.audit.record({
      userId: user.id,
      action: `terrain.${field}.updated`,
      entityType: 'Terrain',
      entityId: id,
      oldValue: { [field]: before[field] },
      newValue: { [field]: value },
      justification,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return terrain;
  }

  @Post(':id/media')
  @RequirePermissions('terrains:modifier')
  @UseInterceptors(FileInterceptor('file'))
  async addMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTerrainAssetDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Un fichier média est obligatoire');
    const media = await this.terrains.addMedia(id, dto, file);
    await this.audit.record({ userId: user.id, action: 'terrain.media.created', entityType: 'TerrainMedia', entityId: media.id, newValue: { terrainId: id, type: dto.type } });
    return media;
  }

  @Post(':id/documents')
  @RequirePermissions('terrains:modifier')
  @UseInterceptors(FileInterceptor('file'))
  async addDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTerrainAssetDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Un document est obligatoire');
    const document = await this.terrains.addDocument(id, dto, file);
    await this.audit.record({ userId: user.id, action: 'terrain.document.created', entityType: 'TerrainDocument', entityId: document.id, newValue: { terrainId: id, type: dto.type } });
    return document;
  }

  @Delete(':id/media/:mediaId')
  @RequirePermissions('terrains:modifier')
  async removeMedia(@Param('id', ParseUUIDPipe) id: string, @Param('mediaId', ParseUUIDPipe) mediaId: string, @CurrentUser() user: AuthenticatedUser) {
    await this.terrains.removeMedia(id, mediaId);
    await this.audit.record({ userId: user.id, action: 'terrain.media.deleted', entityType: 'TerrainMedia', entityId: mediaId });
    return { success: true };
  }

  @Delete(':id/documents/:documentId')
  @RequirePermissions('terrains:modifier')
  async removeDocument(@Param('id', ParseUUIDPipe) id: string, @Param('documentId', ParseUUIDPipe) documentId: string, @CurrentUser() user: AuthenticatedUser) {
    await this.terrains.removeDocument(id, documentId);
    await this.audit.record({ userId: user.id, action: 'terrain.document.deleted', entityType: 'TerrainDocument', entityId: documentId });
    return { success: true };
  }
}
