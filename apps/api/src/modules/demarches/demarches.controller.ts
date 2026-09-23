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
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { DemarchesService } from './demarches.service';
import { DemarchesOptionsService } from './demarches-options.service';
import { DemarchesEtapesService } from './demarches-etapes.service';
import { DemarchesDocumentsService } from './demarches-documents.service';
import { DemarchesClientService } from './demarches-client.service';
import {
  CreateClientMissionDto,
  CreateMissionDto,
  QueryMissionDto,
  TransitionMissionDto,
  UpdateMissionDto,
} from './dto/mission.dto';
import {
  CreateDocumentMissionDto,
  CreateEtapeMissionDto,
  UpdateEtapeMissionDto,
} from './dto/etape-mission.dto';

/**
 * Missions de vérification foncière (J2.2, section 14 du cahier des charges).
 *
 * Les routes littérales (`options`, `stats`) sont déclarées avant celles à
 * paramètre, sans quoi « options » serait lu comme un identifiant.
 */
@ApiTags('demarches')
@Controller('demarches/missions')
export class DemarchesController {
  constructor(
    private readonly missions: DemarchesService,
    private readonly options: DemarchesOptionsService,
    private readonly etapes: DemarchesEtapesService,
    private readonly documents: DemarchesDocumentsService,
    private readonly client: DemarchesClientService,
    private readonly audit: AuditService,
  ) {}

  // --- Espace client : le demandeur suit sa mission et lit son rapport ---
  // Déclarées avant les routes à paramètre, sinon « client » serait pris
  // pour un identifiant de mission.

  @Get('client/missions')
  getClientMissions(@CurrentUser() user: AuthenticatedUser) {
    return this.client.getMissions(user.id);
  }

  /**
   * Demande déposée par le client depuis son espace. Même limitation que les
   * formulaires publics : un client connecté reste un émetteur externe.
   */
  @Post('client/missions')
  @Throttle({
    default: {
      limit: Number.parseInt(process.env.RESERVATION_RATE_LIMIT_MAX ?? '5', 10),
      ttl:
        Number.parseInt(process.env.RESERVATION_RATE_LIMIT_TTL ?? '60', 10) *
        1000,
    },
  })
  async createClientMission(
    @Body() dto: CreateClientMissionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const mission = await this.client.createMission(user.id, dto);
    await this.audit.record({
      userId: user.id,
      action: 'mission.demandee_par_client',
      entityType: 'MissionVerification',
      entityId: mission.id,
      newValue: { reference: mission.referenceInterne, ...dto },
    });
    return mission;
  }

  @Get('client/missions/documents/:documentId')
  getClientDocument(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.client.getDocument(user.id, documentId);
  }

  @Get()
  @RequirePermissions('demarches:consulter')
  findAll(
    @Query() query: QueryMissionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.missions.findAll(query, user);
  }

  @Get('options')
  @RequirePermissions('demarches:consulter')
  getOptions() {
    return this.options.getOptions();
  }

  @Get('collaborateurs')
  @RequirePermissions('demarches:consulter')
  getCollaborateurs() {
    return this.missions.getCollaborateurs();
  }

  /**
   * Export CSV des missions. POST et non GET : la justification voyage dans
   * le corps, jamais dans l'URL.
   */
  @Post('export')
  @RequirePermissions('demarches:exporter')
  async exportCsv(
    @Body('justification') justification: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    if (!justification || justification.trim().length < 3) {
      throw new BadRequestException(
        'Une justification minimale de 3 caractères est obligatoire pour exporter les missions',
      );
    }
    const csv = await this.missions.exportCsv(user, justification.trim());
    const date = new Date().toISOString().slice(0, 10);
    res
      .status(200)
      .setHeader('Content-Type', 'text/csv; charset=utf-8')
      .setHeader(
        'Content-Disposition',
        `attachment; filename="verifications-${date}.csv"`,
      )
      // BOM UTF-8 : Excel affiche correctement les accents.
      .send('﻿' + csv);
  }

  @Get('stats')
  @RequirePermissions('demarches:consulter')
  getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.missions.getStats(user);
  }

  @Get(':id')
  @RequirePermissions('demarches:consulter')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.missions.findOne(id, user);
  }

  @Post()
  @RequirePermissions('demarches:creer')
  async create(
    @Body() dto: CreateMissionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const mission = await this.missions.create(dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'mission.created',
      entityType: 'MissionVerification',
      entityId: mission.id,
      newValue: { reference: mission.referenceInterne, ...dto },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return mission;
  }

  @Patch(':id')
  @RequirePermissions('demarches:modifier')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMissionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const avant = await this.missions.findOne(id, user);
    const mission = await this.missions.update(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'mission.updated',
      entityType: 'MissionVerification',
      entityId: id,
      oldValue: { statut: avant.statut, decision: avant.decision },
      newValue: dto,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return mission;
  }

  @Patch(':id/etape')
  @RequirePermissions('demarches:modifier')
  async transition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionMissionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const avant = await this.missions.findOne(id, user);
    const mission = await this.missions.transition(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'mission.transition',
      entityType: 'MissionVerification',
      entityId: id,
      oldValue: { statut: avant.statut },
      newValue: { statut: dto.statut },
      justification: dto.justification,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return mission;
  }

  @Delete(':id')
  @RequirePermissions('demarches:supprimer')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const avant = await this.missions.findOne(id, user);
    await this.missions.remove(id, user);
    await this.audit.record({
      userId: user.id,
      action: 'mission.deleted',
      entityType: 'MissionVerification',
      entityId: id,
      oldValue: { reference: avant.referenceInterne, statut: avant.statut },
      justification: 'Suppression de la mission',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { success: true };
  }

  // --- Constats : visites et administrations consultées ---

  @Get(':id/etapes')
  @RequirePermissions('demarches:consulter')
  findEtapes(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.etapes.findAll(id, user);
  }

  @Post(':id/etapes')
  @RequirePermissions('demarches:modifier')
  async addEtape(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateEtapeMissionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const etape = await this.etapes.create(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'mission.etape.created',
      entityType: 'EtapeMission',
      entityId: etape.id,
      newValue: { missionId: id, ...dto },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return etape;
  }

  @Patch(':id/etapes/:etapeId')
  @RequirePermissions('demarches:modifier')
  async updateEtape(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('etapeId', ParseUUIDPipe) etapeId: string,
    @Body() dto: UpdateEtapeMissionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const etape = await this.etapes.update(id, etapeId, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'mission.etape.updated',
      entityType: 'EtapeMission',
      entityId: etapeId,
      newValue: { missionId: id, ...dto },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return etape;
  }

  @Delete(':id/etapes/:etapeId')
  @RequirePermissions('demarches:modifier')
  async removeEtape(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('etapeId', ParseUUIDPipe) etapeId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    await this.etapes.remove(id, etapeId, user);
    await this.audit.record({
      userId: user.id,
      action: 'mission.etape.deleted',
      entityType: 'EtapeMission',
      entityId: etapeId,
      oldValue: { missionId: id },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { success: true };
  }

  // --- Pièces et rapport ---

  @Get(':id/documents')
  @RequirePermissions('demarches:consulter')
  findDocuments(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.findAll(id, user);
  }

  @Post(':id/documents')
  @RequirePermissions('demarches:modifier')
  @UseInterceptors(FileInterceptor('file'))
  async addDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDocumentMissionDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const document = await this.documents.addDocument(id, dto, file, user);
    await this.audit.record({
      userId: user.id,
      action: 'mission.document.uploaded',
      entityType: 'DocumentMission',
      entityId: document.id,
      newValue: {
        missionId: id,
        etapeId: dto.etapeId ?? null,
        type: dto.type,
        title: dto.title,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return document;
  }

  @Post(':id/rapport')
  @RequirePermissions('demarches:valider')
  async generateReport(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const document = await this.documents.generateReport(id, user);
    await this.audit.record({
      userId: user.id,
      action: 'mission.rapport.genere',
      entityType: 'DocumentMission',
      entityId: document.id,
      newValue: { missionId: id, version: document.version },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return document;
  }

  @Patch(':id/documents/:documentId/visibilite')
  @RequirePermissions('demarches:publier')
  async setDocumentVisibility(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body('isPublic') isPublic: boolean,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const document = await this.documents.setVisibility(
      id,
      documentId,
      Boolean(isPublic),
      user,
    );
    await this.audit.record({
      userId: user.id,
      action: 'mission.document.visibilite',
      entityType: 'DocumentMission',
      entityId: documentId,
      newValue: { missionId: id, isPublic: Boolean(isPublic) },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return document;
  }

  @Delete(':id/documents/:documentId')
  @RequirePermissions('demarches:modifier')
  async removeDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    await this.documents.removeDocument(id, documentId, user);
    await this.audit.record({
      userId: user.id,
      action: 'mission.document.deleted',
      entityType: 'DocumentMission',
      entityId: documentId,
      oldValue: { missionId: id },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { success: true };
  }
}
