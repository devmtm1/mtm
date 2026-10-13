import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuditService } from '../audit/audit.service';
import { CompanyProfileService } from '../company/company-profile.service';
import { QueryPeriodeDto } from '../finances/dto/finances.dto';
import { DossiersBloquesService } from './dossiers-bloques.service';
import { nomFichier } from './pilotage.calculs';
import { renderRapportPdf } from './rapport-pdf';
import { renderRapportXlsx } from './rapport-xlsx';
import { ReglagesPilotageService } from './reglages-pilotage.service';
import { EnvoiAutomatiqueService } from './envoi-automatique.service';
import { RapportsService } from './rapports.service';
import { TableauxService } from './tableaux.service';

export class QueryRapportDto extends QueryPeriodeDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  region?: string;
}

export class QueryCommercialDto {
  @IsOptional()
  @IsUUID()
  commercialId?: string;
}

export class ExportRapportDto extends QueryRapportDto {
  @IsIn(['pdf', 'xlsx'])
  format!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(300)
  justification!: string;
}

/** Délais de « dossier bloqué » : des jours entiers, de 1 à 365. */
export class SeuilsBlocageDto {
  @IsOptional() @IsInt() @Min(1) @Max(365) vente?: number;
  @IsOptional() @IsInt() @Min(1) @Max(365) mission?: number;
  @IsOptional() @IsInt() @Min(1) @Max(365) chantier?: number;
  @IsOptional() @IsInt() @Min(1) @Max(365) prospect?: number;
  @IsOptional() @IsInt() @Min(1) @Max(365) tache?: number;
}

/** Envoi automatique : la cohérence fine (rapports connus, au moins un destinataire…) est contrôlée par le service. */
export class EnvoiAutomatiqueDto {
  @IsBoolean() actif!: boolean;
  @IsIn(['hebdomadaire', 'mensuelle']) frequence!: string;
  @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) rapports!: string[];
  @IsArray() @ArrayMaxSize(2) @IsString({ each: true }) formats!: string[];
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  destinataires!: string[];
}

const TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/**
 * Pilotage (J3.2, section 23) : trois tableaux de bord — direction, manager,
 * commercial — et les rapports exportables en PDF et en Excel.
 *
 * - tableau commercial : tout collaborateur qui suit des prospects (le sien) ;
 *   un collègue ne voit celui d'un autre que s'il encadre ;
 * - tableau manager, dossiers bloqués, rapports : « rapports:consulter » ;
 * - tableau direction : « rapports:administrer » ;
 * - export d'un rapport : « rapports:exporter », motif obligatoire et tracé.
 */
@ApiTags('pilotage')
@Controller('pilotage')
export class PilotageController {
  constructor(
    private readonly tableaux: TableauxService,
    private readonly bloques: DossiersBloquesService,
    private readonly rapports: RapportsService,
    private readonly company: CompanyProfileService,
    private readonly audit: AuditService,
    private readonly reglages: ReglagesPilotageService,
    private readonly envoi: EnvoiAutomatiqueService,
  ) {}

  @Get('reglages')
  @RequirePermissions('rapports:administrer')
  lireReglages() {
    return this.reglages.lire();
  }

  @Put('reglages/seuils')
  @RequirePermissions('rapports:administrer')
  enregistrerSeuils(
    @Body() dto: SeuilsBlocageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reglages.enregistrerSeuils(
      dto as Record<string, number>,
      user.id,
    );
  }

  @Put('reglages/envoi')
  @RequirePermissions('rapports:administrer')
  enregistrerEnvoi(
    @Body() dto: EnvoiAutomatiqueDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reglages.enregistrerEnvoi(dto, user.id);
  }

  /** Envoie un exemplaire de test à la personne connectée (et à elle seule). */
  @Post('reglages/envoi/test')
  @HttpCode(200)
  @RequirePermissions('rapports:administrer')
  essaiEnvoi(@CurrentUser() user: AuthenticatedUser) {
    return this.envoi.envoyerTest(user.email);
  }

  @Get('direction')
  @RequirePermissions('rapports:administrer')
  direction(@Query() query: QueryPeriodeDto) {
    return this.tableaux.direction(query);
  }

  @Get('manager')
  @RequirePermissions('rapports:consulter')
  manager(
    @Query() query: QueryPeriodeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tableaux.manager(query, user);
  }

  @Get('commercial')
  @RequirePermissions('crm:consulter')
  commercial(
    @Query() query: QueryCommercialDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tableaux.commercial(user, query.commercialId);
  }

  @Get('dossiers-bloques')
  @RequirePermissions('rapports:consulter')
  dossiersBloques() {
    return this.bloques.lister();
  }

  @Get('rapports')
  @RequirePermissions('rapports:consulter')
  catalogue() {
    return this.rapports.catalogue();
  }

  @Get('rapports/:code')
  @RequirePermissions('rapports:consulter')
  apercu(@Param('code') code: string, @Query() query: QueryRapportDto) {
    return this.rapports.generer(code, query);
  }

  @Post('rapports/:code/export')
  @HttpCode(200)
  @RequirePermissions('rapports:exporter')
  async exporter(
    @Param('code') code: string,
    @Body() dto: ExportRapportDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) reponse: Response,
  ) {
    const donnees = await this.rapports.generer(code, dto);
    const contenu =
      dto.format === 'pdf'
        ? renderRapportPdf(donnees, await this.company.getSociete())
        : await renderRapportXlsx(donnees);
    await this.audit.record({
      userId: user.id,
      action: 'rapport.export',
      entityType: 'Rapport',
      entityId: code,
      justification: dto.justification,
      newValue: {
        format: dto.format,
        du: dto.du,
        au: dto.au,
        region: dto.region,
      },
    });
    const nom = `${nomFichier(donnees.titre, donnees.periode?.du ?? null, donnees.periode?.au ?? null)}.${dto.format}`;
    reponse.setHeader('Content-Type', TYPES[dto.format]);
    reponse.setHeader('Content-Disposition', `attachment; filename="${nom}"`);
    return new StreamableFile(contenu);
  }
}
