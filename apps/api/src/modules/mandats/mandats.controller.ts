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
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { CreateMandatDto } from './dto/create-mandat.dto';
import { QueryMandatDto } from './dto/query-mandat.dto';
import { UpdateMandatDto } from './dto/update-mandat.dto';
import { CreateMandatLotDto } from './dto/create-mandat-lot.dto';
import { UpdateMandatLotDto } from './dto/update-mandat-lot.dto';
import { CreateMandatDocumentDto } from './dto/create-mandat-document.dto';
import { MandatsService } from './mandats.service';
import { MandatsFinanceService } from './mandats-finance.service';
import { MandatsAlertesService } from './mandats-alertes.service';
import { MandatsLotsService } from './mandats-lots.service';
import { MandatsDocumentsService } from './mandats-documents.service';

@ApiTags('mandats')
@Controller('mandats')
export class MandatsController {
  constructor(
    private readonly mandats: MandatsService,
    private readonly finance: MandatsFinanceService,
    private readonly alertes: MandatsAlertesService,
    private readonly lots: MandatsLotsService,
    private readonly documents: MandatsDocumentsService,
    private readonly audit: AuditService,
  ) {}

  @Get() @RequirePermissions('mandats:consulter') findAll(
    @Query() query: QueryMandatDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mandats.findAll(query, user);
  }

  @Get('options') @RequirePermissions('mandats:consulter') getOptions() {
    return this.mandats.getOptions();
  }

  @Get('stats') @RequirePermissions('mandats:consulter') getStats(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.finance.getStats(user);
  }

  @Get(':id/financial')
  @RequirePermissions('mandats:consulter')
  getFinancialSummary(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.finance.getFinancialSummary(id, user);
  }

  @Get('expirants') @RequirePermissions('mandats:consulter') getExpirants(
    @CurrentUser() user: AuthenticatedUser,
    @Query('jours') jours?: string,
  ) {
    return this.alertes.getExpirants(jours ? Number(jours) : undefined, user);
  }

  @Post('alerts/check')
  @RequirePermissions('mandats:administrer')
  checkAlerts() {
    return this.alertes.checkAlerts();
  }

  @Get(':id') @RequirePermissions('mandats:consulter') findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mandats.findOne(id, user);
  }

  @Get(':id/history') @RequirePermissions('mandats:consulter') getHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.getHistory(id, user);
  }

  @Post() @RequirePermissions('mandats:creer') async create(
    @Body() dto: CreateMandatDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const mandat = await this.mandats.create(dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'mandat.created',
      entityType: 'Mandat',
      entityId: mandat.id,
      newValue: mandat,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return mandat;
  }

  @Patch(':id') @RequirePermissions('mandats:modifier') async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMandatDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const before = await this.mandats.findOne(id, user);
    const mandat = await this.mandats.update(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'mandat.updated',
      entityType: 'Mandat',
      entityId: id,
      oldValue: before,
      newValue: mandat,
      justification: dto.justification,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return mandat;
  }

  @Delete(':id') @RequirePermissions('mandats:supprimer') async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const before = await this.mandats.findOne(id, user);
    await this.mandats.remove(id, user);
    await this.audit.record({
      userId: user.id,
      action: 'mandat.deleted',
      entityType: 'Mandat',
      entityId: id,
      oldValue: before,
      justification: 'Suppression du mandat',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { success: true };
  }

  @Post(':id/lots') @RequirePermissions('mandats:modifier') async addLot(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMandatLotDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const lot = await this.lots.addLot(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'mandat.lot.created',
      entityType: 'MandatLot',
      entityId: lot.id,
      newValue: {
        mandatId: id,
        terrainId: dto.terrainId,
        statutLot: dto.statutLot,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return lot;
  }

  @Patch(':id/lots/:lotId')
  @RequirePermissions('mandats:modifier')
  async updateLot(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lotId', ParseUUIDPipe) lotId: string,
    @Body() dto: UpdateMandatLotDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const before = await this.mandats.findOne(id, user);
    const lot = await this.lots.updateLot(id, lotId, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'mandat.lot.updated',
      entityType: 'MandatLot',
      entityId: lotId,
      oldValue: {
        statutLot:
          before.lots?.find((l) => l.id === lotId)?.statutLot ?? before.statut,
      },
      newValue: { statutLot: lot.statutLot },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return lot;
  }

  @Delete(':id/lots/:lotId')
  @RequirePermissions('mandats:modifier')
  async removeLot(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lotId', ParseUUIDPipe) lotId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    await this.lots.removeLot(id, lotId, user);
    await this.audit.record({
      userId: user.id,
      action: 'mandat.lot.deleted',
      entityType: 'MandatLot',
      entityId: lotId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { success: true };
  }

  @Post(':id/documents')
  @RequirePermissions('mandats:modifier')
  @UseInterceptors(FileInterceptor('file'))
  async addDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMandatDocumentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Un document est obligatoire');
    const document = await this.documents.addDocument(id, dto, file, user);
    await this.audit.record({
      userId: user.id,
      action: 'mandat.document.created',
      entityType: 'MandatDocument',
      entityId: document.id,
      newValue: { mandatId: id, type: dto.type },
    });
    return document;
  }

  @Delete(':id/documents/:documentId')
  @RequirePermissions('mandats:modifier')
  async removeDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.documents.removeDocument(id, documentId, user);
    await this.audit.record({
      userId: user.id,
      action: 'mandat.document.deleted',
      entityType: 'MandatDocument',
      entityId: documentId,
    });
    return { success: true };
  }
}
