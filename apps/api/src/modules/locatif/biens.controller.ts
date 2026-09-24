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
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { BiensService } from './biens.service';
import { BauxService } from './baux.service';
import { DocumentsLocatifService } from './documents.service';
import { LocatifOptionsService } from './locatif-options.service';
import { CreateBienDto, QueryBienDto, UpdateBienDto } from './dto/bien.dto';
import { ChangerLocataireDto, CreateBailDto } from './dto/bail.dto';
import { GenererReleveDto } from './dto/releve.dto';

/**
 * Biens locatifs (J2.1, section 15 du cahier des charges).
 *
 * Les routes littérales (`options`, `stats`, `collaborateurs`) sont
 * déclarées avant celles à paramètre, sans quoi elles seraient lues comme
 * un identifiant de bien.
 */
@ApiTags('locatif')
@Controller('locatif/biens')
export class BiensController {
  constructor(
    private readonly biens: BiensService,
    private readonly baux: BauxService,
    private readonly documents: DocumentsLocatifService,
    private readonly options: LocatifOptionsService,
    private readonly audit: AuditService,
  ) {}

  @Get('options')
  @RequirePermissions('locatif:consulter')
  getOptions() {
    return this.options.getOptions();
  }

  @Get('collaborateurs')
  @RequirePermissions('locatif:consulter')
  getCollaborateurs() {
    return this.biens.getCollaborateurs();
  }

  @Get('stats')
  @RequirePermissions('locatif:consulter')
  getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.biens.getStats(user);
  }

  @Get()
  @RequirePermissions('locatif:consulter')
  findAll(
    @Query() query: QueryBienDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.biens.findAll(query, user);
  }

  @Get(':id')
  @RequirePermissions('locatif:consulter')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.biens.findOne(id, user);
  }

  @Post()
  @RequirePermissions('locatif:creer')
  async create(
    @Body() dto: CreateBienDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const bien = await this.biens.create(dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'bien.created',
      entityType: 'BienLocatif',
      entityId: bien.id,
      newValue: { reference: bien.referenceInterne, ...dto },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return bien;
  }

  @Patch(':id')
  @RequirePermissions('locatif:modifier')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBienDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const avant = await this.biens.findOne(id, user);
    const bien = await this.biens.update(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'bien.updated',
      entityType: 'BienLocatif',
      entityId: id,
      oldValue: { statut: avant.statut },
      newValue: dto,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return bien;
  }

  @Delete(':id')
  @RequirePermissions('locatif:supprimer')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const avant = await this.biens.findOne(id, user);
    await this.biens.remove(id, user);
    await this.audit.record({
      userId: user.id,
      action: 'bien.deleted',
      entityType: 'BienLocatif',
      entityId: id,
      oldValue: { reference: avant.referenceInterne },
      justification: 'Suppression du bien locatif',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { success: true };
  }

  // --- Baux : historique et création (le changement de statut d'un bail
  // se fait via BauxController, sur /locatif/baux) ---

  @Get(':id/baux')
  @RequirePermissions('locatif:consulter')
  findBaux(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.baux.findAll(id, user);
  }

  @Post(':id/baux')
  @RequirePermissions('locatif:creer')
  async createBail(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBailDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const bail = await this.baux.create(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'bail.created',
      entityType: 'BailLocatif',
      entityId: bail.id,
      newValue: { reference: bail.referenceInterne, bienLocatifId: id },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return bail;
  }

  /**
   * Relevé de gestion du bien, publié dans l'espace propriétaire (backlog
   * J2.1 : « espace propriétaire — loyers, solde, rapports »).
   */
  @Post(':id/releve')
  @RequirePermissions('locatif:publier')
  async genererReleve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GenererReleveDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const document = await this.documents.genererReleveGestion(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'bien.releve_gestion.genere',
      entityType: 'DocumentLocatif',
      entityId: document.id,
      newValue: { bienLocatifId: id, ...dto },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return document;
  }

  /**
   * Changement de locataire (section 15) : clôt le bail en cours et ouvre
   * le suivant sur le même bien, en une seule opération tracée.
   */
  @Post(':id/baux/changer-locataire')
  @RequirePermissions('locatif:modifier')
  async changerLocataire(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangerLocataireDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    if (!dto.nouveauBail) {
      throw new BadRequestException(
        'Les informations du nouveau bail sont requises',
      );
    }
    const bail = await this.baux.changerLocataire(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'bail.locataire_change',
      entityType: 'BailLocatif',
      entityId: bail.id,
      newValue: {
        bienLocatifId: id,
        nouveauLocataireId: dto.nouveauBail.locataireId,
      },
      justification: dto.motifCloture,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return bail;
  }
}
