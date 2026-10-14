import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuditService } from '../audit/audit.service';
import { MAX_ASSET_SIZE } from '../../common/storage/asset-validation';
import {
  ClotureDto,
  CreateOperationDto,
  ExportDto,
  JustificationDto,
  QueryJournalDto,
  QueryOperationsDto,
  QueryPeriodeDto,
  RejetOperationDto,
  UpdateOperationDto,
} from './dto/finances.dto';
import { ExportFinancesService } from './export.service';
import { FinancesService } from './finances.service';
import { OperationsFinancieresService } from './operations.service';

/**
 * Finances (J3.1, section 18) : lecture avec « finances:consulter », saisie
 * avec « creer » / « modifier », contrôle avec « valider », export tracé avec
 * « exporter », clôture des mois avec « administrer ».
 */
@ApiTags('finances')
@Controller('finances')
export class FinancesController {
  constructor(
    private readonly finances: FinancesService,
    private readonly operations: OperationsFinancieresService,
    private readonly exports: ExportFinancesService,
    private readonly audit: AuditService,
  ) {}

  @Get('tableau')
  @RequirePermissions('finances:consulter')
  tableau(@Query() query: QueryPeriodeDto) {
    return this.finances.tableau(query);
  }

  @Get('journal')
  @RequirePermissions('finances:consulter')
  journal(@Query() query: QueryJournalDto) {
    return this.finances.journal(query);
  }

  @Get('categories')
  @RequirePermissions('finances:consulter')
  categories() {
    return this.operations.categories();
  }

  // --- opérations saisies ---

  @Get('operations')
  @RequirePermissions('finances:consulter')
  lister(@Query() query: QueryOperationsDto) {
    return this.operations.lister(query);
  }

  @Post('operations')
  @RequirePermissions('finances:creer')
  async creer(
    @Body() dto: CreateOperationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const operation = await this.operations.creer(dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'finances.operation_saisie',
      entityType: 'OperationFinanciere',
      entityId: operation.id,
      newValue: {
        sens: operation.sens,
        activite: operation.activite,
        categorie: operation.categorie,
        montant: operation.montant,
      },
    });
    return operation;
  }

  @Patch('operations/:id')
  @RequirePermissions('finances:modifier')
  modifier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOperationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.operations.modifier(id, dto, user);
  }

  @Post('operations/:id/valider')
  @RequirePermissions('finances:valider')
  async valider(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const operation = await this.operations.valider(id, user);
    await this.audit.record({
      userId: user.id,
      action: 'finances.operation_validee',
      entityType: 'OperationFinanciere',
      entityId: id,
      newValue: { montant: operation.montant, sens: operation.sens },
    });
    return operation;
  }

  @Post('operations/:id/rejeter')
  @RequirePermissions('finances:valider')
  async rejeter(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejetOperationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const operation = await this.operations.rejeter(id, dto.motif, user);
    await this.audit.record({
      userId: user.id,
      action: 'finances.operation_rejetee',
      entityType: 'OperationFinanciere',
      entityId: id,
      justification: dto.motif,
    });
    return operation;
  }

  @Post('operations/:id/justificatif')
  @RequirePermissions('finances:modifier')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_ASSET_SIZE } }),
  )
  joindre(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.operations.joindreJustificatif(id, file, user);
  }

  @Delete('operations/:id')
  @HttpCode(204)
  @RequirePermissions('finances:modifier')
  async supprimer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.operations.supprimer(id, user);
    await this.audit.record({
      userId: user.id,
      action: 'finances.operation_supprimee',
      entityType: 'OperationFinanciere',
      entityId: id,
    });
  }

  // --- clôture mensuelle ---

  @Get('clotures')
  @RequirePermissions('finances:consulter')
  clotures() {
    return this.finances.clotures();
  }

  @Post('clotures')
  @RequirePermissions('finances:administrer')
  async cloturer(
    @Body() dto: ClotureDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const cloture = await this.finances.cloturer(dto.periode, user.id);
    await this.audit.record({
      userId: user.id,
      action: 'finances.mois_cloture',
      entityType: 'ClotureFinanciere',
      entityId: cloture.id,
      newValue: { periode: dto.periode, resume: cloture.resume },
    });
    return cloture;
  }

  @Delete('clotures/:periode')
  @HttpCode(204)
  @RequirePermissions('finances:administrer')
  async rouvrir(
    @Param('periode') periode: string,
    @Body() dto: JustificationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.finances.rouvrir(periode);
    await this.audit.record({
      userId: user.id,
      action: 'finances.mois_rouvert',
      entityType: 'ClotureFinanciere',
      entityId: periode,
      justification: dto.justification,
    });
  }

  // --- export tracé ---

  @Post('export')
  @HttpCode(200)
  @RequirePermissions('finances:exporter')
  async exporter(
    @Body() dto: ExportDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) reponse: Response,
  ) {
    const fichier = await this.exports.generer(dto);
    await this.audit.record({
      userId: user.id,
      action: 'finances.export',
      entityType: 'Finances',
      justification: dto.justification,
      newValue: {
        du: dto.du,
        au: dto.au,
        format: dto.format,
        mouvements: fichier.mouvements,
      },
    });
    reponse.setHeader('Content-Type', fichier.type);
    reponse.setHeader(
      'Content-Disposition',
      `attachment; filename="${fichier.nom}"`,
    );
    return new StreamableFile(fichier.contenu);
  }
}
