import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { AuditService } from '../audit/audit.service';
import { CreateDossierVenteDto } from './dto/create-dossier-vente.dto';
import { CreateCommissionDto } from './dto/create-commission.dto';
import { CreatePaiementDto } from './dto/create-paiement.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { CreateDocumentVenteDto } from './dto/create-document-vente.dto';
import { CreatePublicReservationRequestDto } from './dto/create-public-reservation-request.dto';
import { ConvertReservationRequestDto } from './dto/convert-reservation-request.dto';
import { CreateClientAccountDto } from './dto/create-client-account.dto';
import { UpdateVenteStatusDto } from './dto/update-vente-status.dto';
import { VentesService } from './ventes.service';
import { VentesDocumentsService } from './ventes-documents.service';
import { ClientPortalService } from './client-portal.service';
import { VentesReportingService } from './ventes-reporting.service';
import { VentesPaiementsService } from './ventes-paiements.service';
import { VentesCommissionsService } from './ventes-commissions.service';

@ApiTags('ventes')
@Controller('ventes')
export class VentesController {
  constructor(
    private readonly ventes: VentesService,
    private readonly documents: VentesDocumentsService,
    private readonly clientPortal: ClientPortalService,
    private readonly reporting: VentesReportingService,
    private readonly paiements: VentesPaiementsService,
    private readonly commissions: VentesCommissionsService,
    private readonly audit: AuditService,
  ) {}

  @Post('public/reservation-requests')
  @Public()
  @Throttle({
    default: {
      limit: Number.parseInt(process.env.RESERVATION_RATE_LIMIT_MAX ?? '5', 10),
      ttl:
        Number.parseInt(process.env.RESERVATION_RATE_LIMIT_TTL ?? '60', 10) *
        1000,
    },
  })
  createPublicReservationRequest(
    @Body() dto: CreatePublicReservationRequestDto,
  ) {
    return this.ventes.createPublicReservationRequest(dto);
  }

  @Get()
  @RequirePermissions('ventes:consulter')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.ventes.findAll(user);
  }

  /**
   * Export CSV des dossiers. POST (et non GET) : la justification voyage
   * dans le corps, jamais dans l'URL — les journaux de proxy la garderaient.
   */
  @Post('export')
  @RequirePermissions('ventes:exporter')
  async exportCsv(
    @Body('justification') justification: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    if (!justification || justification.trim().length < 3) {
      throw new BadRequestException(
        'Une justification minimale de 3 caractères est obligatoire pour exporter les dossiers de vente',
      );
    }
    const csv = await this.reporting.exportCsv(user, justification.trim());
    const date = new Date().toISOString().slice(0, 10);
    res
      .status(200)
      .setHeader('Content-Type', 'text/csv; charset=utf-8')
      .setHeader(
        'Content-Disposition',
        `attachment; filename="dossiers-vente-${date}.csv"`,
      )
      // BOM UTF-8 : Excel affiche correctement les accents.
      .send('﻿' + csv);
  }

  @Get('reservation-requests')
  @RequirePermissions('ventes:consulter')
  findReservationRequests(@CurrentUser() user: AuthenticatedUser) {
    return this.ventes.findReservationRequests(user);
  }

  @Post('client-accounts')
  @RequirePermissions('clients:creer')
  createClientAccount(@Body() dto: CreateClientAccountDto) {
    return this.clientPortal.createClientAccount(dto);
  }

  @Get('client/portal')
  getClientPortal(@CurrentUser() user: AuthenticatedUser) {
    return this.clientPortal.getClientPortal(user.id);
  }

  @Get('client/portal/demandes')
  getClientDemandes(@CurrentUser() user: AuthenticatedUser) {
    return this.clientPortal.getClientDemandes(user.id);
  }

  @Get('client/portal/documents/:documentId')
  getClientDocument(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.clientPortal.getClientDocument(user.id, documentId);
  }

  @Post('reservation-requests/:requestId/convert')
  @RequirePermissions('ventes:creer')
  async convertReservationRequest(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: ConvertReservationRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dossier = (await this.ventes.convertReservationRequest(
      requestId,
      dto,
      user,
    )) as { id: string };
    await this.audit.record({
      userId: user.id,
      action: 'vente.reservation_request.converted',
      entityType: 'DossierVente',
      entityId: dossier.id,
      newValue: { reservationRequestId: requestId, dossierId: dossier.id },
    });
    return dossier;
  }

  @Get('dashboard/stats')
  @RequirePermissions('ventes:consulter')
  async getDashboardStats(@CurrentUser() user: AuthenticatedUser) {
    return this.reporting.getDashboardStats(user);
  }

  @Get('dashboard/commercial/:commercialId')
  @RequirePermissions('ventes:consulter')
  async getCommercialPerformance(
    @Param('commercialId', ParseUUIDPipe) commercialId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reporting.getCommercialPerformance(commercialId, user);
  }

  @Get('documents/search')
  @RequirePermissions('ventes:consulter')
  async searchDocuments(
    @CurrentUser() user: AuthenticatedUser,
    @Query('dossierVenteId') dossierVenteId?: string,
    @Query('prospectId') prospectId?: string,
    @Query('terrainId') terrainId?: string,
    @Query('type') type?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.documents.searchDocuments(
      { dossierVenteId, prospectId, terrainId, type, dateFrom, dateTo },
      user,
    );
  }

  @Get(':id')
  @RequirePermissions('ventes:consulter')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ventes.findOne(id, user);
  }

  @Post()
  @RequirePermissions('ventes:creer')
  async create(
    @Body() dto: CreateDossierVenteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dossier = (await this.ventes.create(dto, user)) as { id: string };
    await this.audit.record({
      userId: user.id,
      action: 'vente.created',
      entityType: 'DossierVente',
      entityId: dossier.id,
      newValue: dossier,
    });
    return dossier;
  }

  @Post(':id/reservations')
  @RequirePermissions('ventes:modifier')
  async reserve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReservationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const reservation = await this.ventes.createReservation(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'vente.reservation.created',
      entityType: 'Reservation',
      entityId: reservation.id,
      newValue: reservation,
    });
    return reservation;
  }

  @Post(':id/paiements')
  @RequirePermissions('ventes:payer')
  async pay(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePaiementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.paiements.createPaiement(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'vente.paiement.created',
      entityType: 'Paiement',
      entityId: result.payment.id,
      newValue: result,
    });
    return result;
  }

  @Post(':id/paiements/:paymentId/validate')
  @RequirePermissions('ventes:valider')
  async validatePayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.paiements.validatePaiement(id, paymentId, user);
    await this.audit.record({
      userId: user.id,
      action: 'vente.paiement.validated',
      entityType: 'Paiement',
      entityId: paymentId,
      newValue: result,
    });
    return result;
  }

  @Post(':id/commissions')
  @RequirePermissions('ventes:modifier')
  async addCommission(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCommissionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const commission = await this.commissions.createCommission(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'vente.commission.created',
      entityType: 'CommissionVente',
      entityId: commission.id,
      newValue: commission,
    });
    return commission;
  }

  @Post(':id/commissions/:commissionId/validate')
  @RequirePermissions('ventes:valider')
  async validateCommission(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('commissionId', ParseUUIDPipe) commissionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const commission = await this.commissions.validateCommission(
      id,
      commissionId,
      user,
    );
    await this.audit.record({
      userId: user.id,
      action: 'vente.commission.validated',
      entityType: 'CommissionVente',
      entityId: commissionId,
      newValue: commission,
    });
    return commission;
  }

  @Post(':id/commissions/:commissionId/pay')
  @RequirePermissions('ventes:payer')
  async payCommission(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('commissionId', ParseUUIDPipe) commissionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const commission = await this.commissions.payCommission(
      id,
      commissionId,
      user,
    );
    await this.audit.record({
      userId: user.id,
      action: 'vente.commission.paid',
      entityType: 'CommissionVente',
      entityId: commissionId,
      newValue: commission,
    });
    return commission;
  }

  @Post(':id/status')
  @RequirePermissions('ventes:modifier')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVenteStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dossier = await this.ventes.updateStatus(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'vente.status.updated',
      entityType: 'DossierVente',
      entityId: id,
      newValue: { statut: dto.statut },
    });
    return dossier;
  }

  @Post(':id/documents/generated')
  @RequirePermissions('ventes:modifier')
  async generateDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDocumentVenteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (dto.isPublic && !user.permissions.includes('ventes:publier')) {
      throw new ForbiddenException(
        'La publication du document nécessite la permission ventes:publier',
      );
    }
    const document = await this.documents.generateDocument(
      id,
      dto,
      user,
      dto.isPublic ?? false,
    );
    await this.audit.record({
      userId: user.id,
      action: 'vente.document.generated',
      entityType: 'DocumentVente',
      entityId: document.id,
      newValue: { dossierVenteId: id, type: dto.type, isGenerated: true },
    });
    return document;
  }

  @Post(':id/documents')
  @RequirePermissions('ventes:modifier')
  @UseInterceptors(FileInterceptor('file'))
  async addDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDocumentVenteDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Un document est obligatoire');
    if (dto.isPublic && !user.permissions.includes('ventes:publier')) {
      throw new ForbiddenException(
        'La publication du document nécessite la permission ventes:publier',
      );
    }
    const document = await this.documents.addDocument(
      id,
      dto,
      file,
      user,
      dto.isPublic ?? false,
    );
    await this.audit.record({
      userId: user.id,
      action: 'vente.document.created',
      entityType: 'DocumentVente',
      entityId: document.id,
      newValue: { dossierVenteId: id, type: dto.type },
    });
    return document;
  }

  @Delete(':id/documents/:documentId')
  @RequirePermissions('ventes:modifier')
  async removeDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.documents.removeDocument(id, documentId, user);
    await this.audit.record({
      userId: user.id,
      action: 'vente.document.deleted',
      entityType: 'DocumentVente',
      entityId: documentId,
    });
    return { success: true };
  }

  @Get(':id/echeances')
  @RequirePermissions('ventes:consulter')
  async getEcheances(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<unknown[]> {
    return this.paiements.getEcheances(id, user);
  }
}
