import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { CreateProprietaireDto } from './dto/create-proprietaire.dto';
import { UpdateProprietaireDto } from './dto/update-proprietaire.dto';
import { CreateClientAccountDto } from '../client-accounts/dto/create-client-account.dto';
import { ProprietairesService } from './proprietaires.service';
import { masquerCoordonnees } from './coordonnees';
import { MAX_ASSET_SIZE } from '../../common/storage/asset-validation';

@ApiTags('proprietaires')
@Controller('proprietaires')
export class ProprietairesController {
  constructor(
    private readonly proprietaires: ProprietairesService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermissions('proprietaires:consulter')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.proprietaires.findAll(user);
  }

  /** Matricule que recevra le prochain propriétaire : aperçu affiché dans le formulaire. */
  @Get('prochain-matricule')
  @RequirePermissions('proprietaires:creer')
  async prochainMatricule() {
    return { matricule: await this.proprietaires.prochainMatricule() };
  }

  @Get(':id')
  @RequirePermissions('proprietaires:consulter')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.proprietaires.findById(id, user);
  }

  @Post()
  @RequirePermissions('proprietaires:creer')
  async create(
    @Body() dto: CreateProprietaireDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const proprietaire = await this.proprietaires.create(dto);
    await this.audit.record({
      userId: user.id,
      action: 'proprietaire.created',
      entityType: 'Proprietaire',
      entityId: proprietaire.id,
      newValue: {
        matricule: proprietaire.matricule,
        firstName: proprietaire.firstName,
        lastName: proprietaire.lastName,
        email: proprietaire.email,
        phone: proprietaire.phone,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return masquerCoordonnees(proprietaire, user);
  }

  @Patch(':id')
  @RequirePermissions('proprietaires:modifier')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProprietaireDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const before = await this.proprietaires.findById(id);
    const proprietaire = await this.proprietaires.update(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'proprietaire.updated',
      entityType: 'Proprietaire',
      entityId: id,
      oldValue: {
        firstName: before.firstName,
        lastName: before.lastName,
        email: before.email,
        phone: before.phone,
        notes: before.notes,
      },
      newValue: {
        firstName: proprietaire.firstName,
        lastName: proprietaire.lastName,
        email: proprietaire.email,
        phone: proprietaire.phone,
        notes: proprietaire.notes,
      },
      justification: 'Modification des informations du propriétaire',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return masquerCoordonnees(proprietaire, user);
  }

  /** Copie PDF de la pièce d'identité (facultative) : remplace la précédente. */
  @Post(':id/piece-identite')
  @RequirePermissions('proprietaires:modifier')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_ASSET_SIZE } }),
  )
  async deposerPiece(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const proprietaire = await this.proprietaires.deposerPiece(id, file);
    await this.audit.record({
      userId: user.id,
      action: 'proprietaire.piece_deposee',
      entityType: 'Proprietaire',
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return masquerCoordonnees(proprietaire, user);
  }

  @Delete(':id/piece-identite')
  @RequirePermissions('proprietaires:modifier')
  async retirerPiece(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const proprietaire = await this.proprietaires.retirerPiece(id);
    await this.audit.record({
      userId: user.id,
      action: 'proprietaire.piece_retiree',
      entityType: 'Proprietaire',
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return masquerCoordonnees(proprietaire, user);
  }

  @Post(':id/compte-client')
  @RequirePermissions('clients:creer')
  async createClientAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateClientAccountDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const account = await this.proprietaires.createClientAccount(
      id,
      dto.password,
    );
    await this.audit.record({
      userId: user.id,
      action: 'proprietaire.client_account_created',
      entityType: 'Proprietaire',
      entityId: id,
      newValue: { email: account.email },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return account;
  }

  @Delete(':id')
  @RequirePermissions('proprietaires:supprimer')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const before = await this.proprietaires.findById(id);
    await this.proprietaires.remove(id);
    await this.audit.record({
      userId: user.id,
      action: 'proprietaire.deleted',
      entityType: 'Proprietaire',
      entityId: id,
      oldValue: {
        firstName: before.firstName,
        lastName: before.lastName,
        email: before.email,
      },
      justification: 'Suppression du propriétaire',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { success: true };
  }
}
