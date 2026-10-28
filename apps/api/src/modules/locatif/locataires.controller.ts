import {
  Body,
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
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { LocatairesService } from './locataires.service';
import { CreateLocataireDto, UpdateLocataireDto } from './dto/locataire.dto';
import { MAX_ASSET_SIZE } from '../../common/storage/asset-validation';
import { CreateClientAccountDto } from '../client-accounts/dto/create-client-account.dto';

/** Fiches locataires (J2.1) : nécessaires pour créer un bail. */
@ApiTags('locatif')
@Controller('locatif/locataires')
export class LocatairesController {
  constructor(
    private readonly locataires: LocatairesService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermissions('locatif:consulter')
  findAll(@Query('search') search?: string) {
    return this.locataires.findAll(search);
  }

  @Get(':id')
  @RequirePermissions('locatif:consulter')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.locataires.findById(id);
  }

  @Get(':id/baux')
  @RequirePermissions('locatif:consulter')
  findBaux(@Param('id', ParseUUIDPipe) id: string) {
    return this.locataires.findBaux(id);
  }

  @Post()
  @RequirePermissions('locatif:creer')
  create(@Body() dto: CreateLocataireDto) {
    return this.locataires.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('locatif:modifier')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLocataireDto,
  ) {
    return this.locataires.update(id, dto);
  }

  /** Copie PDF de la pièce d'identité (facultative) : remplace la précédente. */
  @Post(':id/piece-identite')
  @RequirePermissions('locatif:modifier')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_ASSET_SIZE } }),
  )
  async deposerPiece(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const locataire = await this.locataires.deposerPiece(id, file);
    await this.audit.record({
      userId: user.id,
      action: 'locataire.piece_deposee',
      entityType: 'Locataire',
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return locataire;
  }

  @Delete(':id/piece-identite')
  @RequirePermissions('locatif:modifier')
  async retirerPiece(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const locataire = await this.locataires.retirerPiece(id);
    await this.audit.record({
      userId: user.id,
      action: 'locataire.piece_retiree',
      entityType: 'Locataire',
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return locataire;
  }

  @Post(':id/compte-client')
  @RequirePermissions('clients:creer')
  async createClientAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateClientAccountDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const account = await this.locataires.createClientAccount(id, dto.password);
    await this.audit.record({
      userId: user.id,
      action: 'locataire.client_account_created',
      entityType: 'Locataire',
      entityId: id,
      newValue: { email: account.email },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return account;
  }
}
