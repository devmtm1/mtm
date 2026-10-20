import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { QueryPeriodeDto } from './dto/finances.dto';
import {
  QueryRapportDto,
  QueryRapportQuotidienDto,
  QueryRapportsQuotidiensDto,
} from './dto/tresorerie.dto';
import {
  CATALOGUE_RAPPORTS,
  ControleService,
  rapportVersCsv,
} from './controle.service';
import { RapportQuotidienService } from './rapport-quotidien.service';

const aujourdhui = (): string => new Date().toISOString().slice(0, 10);

/**
 * Pilotage de la Direction générale : tableau de bord consolidé, états à la
 * demande et rapport financier quotidien (préparé, vérifié, transmis, en PDF).
 */
@ApiTags('finances')
@Controller('finances')
export class ControleController {
  constructor(
    private readonly controle: ControleService,
    private readonly rapports: RapportQuotidienService,
    private readonly audit: AuditService,
  ) {}

  @Get('direction')
  @RequirePermissions('finances:consulter')
  direction(@Query() query: QueryPeriodeDto) {
    return this.controle.direction(query);
  }

  // --- états à la demande ---

  @Get('etats')
  @RequirePermissions('finances:consulter')
  catalogue() {
    return CATALOGUE_RAPPORTS;
  }

  @Get('etats/:code')
  @RequirePermissions('finances:consulter')
  async etat(
    @Param('code') code: string,
    @Query() query: QueryRapportDto,
    @Res({ passthrough: true }) reponse: Response,
  ) {
    const rapport = await this.controle.rapport(code, query);
    if (!query.csv) return rapport;
    reponse.setHeader('Content-Type', 'text/csv; charset=utf-8');
    reponse.setHeader(
      'Content-Disposition',
      `attachment; filename="${rapport.code}.csv"`,
    );
    return new StreamableFile(rapportVersCsv(rapport));
  }

  // --- rapport financier quotidien ---

  @Get('rapport-quotidien')
  @RequirePermissions('finances:consulter')
  rapport(@Query() query: QueryRapportQuotidienDto) {
    return this.rapports.obtenir(query.date ?? aujourdhui());
  }

  @Get('rapport-quotidien/historique')
  @RequirePermissions('finances:consulter')
  historique(@Query() query: QueryRapportsQuotidiensDto) {
    return this.rapports.lister(query.limite);
  }

  @Get('rapport-quotidien/pdf')
  @RequirePermissions('finances:consulter')
  async pdf(
    @Query() query: QueryRapportQuotidienDto,
    @Res({ passthrough: true }) reponse: Response,
  ) {
    const fichier = await this.rapports.pdf(query.date ?? aujourdhui());
    reponse.setHeader('Content-Type', 'application/pdf');
    reponse.setHeader(
      'Content-Disposition',
      `attachment; filename="${fichier.nom}"`,
    );
    return new StreamableFile(fichier.contenu);
  }

  @Post('rapport-quotidien/preparer')
  @RequirePermissions('finances:creer')
  preparer(
    @Body() dto: QueryRapportQuotidienDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rapports.preparer(dto.date ?? aujourdhui(), user);
  }

  @Post('rapport-quotidien/verifier')
  @RequirePermissions('finances:valider')
  verifier(
    @Body() dto: QueryRapportQuotidienDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rapports.verifier(dto.date ?? aujourdhui(), user);
  }

  @Post('rapport-quotidien/transmettre')
  @RequirePermissions('finances:creer')
  async transmettre(
    @Body() dto: QueryRapportQuotidienDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const jour = dto.date ?? aujourdhui();
    const rapport = await this.rapports.transmettre(jour, user);
    await this.audit.record({
      userId: user.id,
      action: 'finances.rapport_transmis',
      entityType: 'RapportQuotidien',
      entityId: rapport.id,
      newValue: {
        date: jour,
        aucuneOperation: rapport.contenu.aucuneOperation,
        anomalies: rapport.contenu.anomalies.length,
      },
    });
    return rapport;
  }
}
