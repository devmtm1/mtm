import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { MAX_ASSET_SIZE } from '../../common/storage/asset-validation';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { ChantiersFinanceService } from './chantiers-finance.service';
import {
  CreatePaiementChantierDto,
  DefinirEcheancesDto,
  MotifDto,
  QueryPaiementsChantierDto,
} from './dto/tresorerie.dto';

/**
 * Fiche financière d'un chantier : échéancier et paiements du client, coût
 * réel, marges. Les dépenses du chantier restent saisies et validées dans le
 * module Construction.
 */
@ApiTags('finances')
@Controller('finances/chantiers')
export class ChantiersFinanceController {
  constructor(
    private readonly chantiers: ChantiersFinanceService,
    private readonly audit: AuditService,
  ) {}

  @Get('rentabilite')
  @RequirePermissions('finances:consulter')
  rentabilite() {
    return this.chantiers.rentabilite();
  }

  @Get('paiements')
  @RequirePermissions('finances:consulter')
  paiements(@Query() query: QueryPaiementsChantierDto) {
    return this.chantiers.listerPaiements(query);
  }

  @Get(':id')
  @RequirePermissions('finances:consulter')
  fiche(@Param('id', ParseUUIDPipe) id: string) {
    return this.chantiers.fiche(id);
  }

  @Put(':id/echeances')
  @RequirePermissions('finances:modifier')
  async echeances(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DefinirEcheancesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const fiche = await this.chantiers.definirEcheances(id, dto);
    await this.audit.record({
      userId: user.id,
      action: 'finances.echeancier_chantier',
      entityType: 'ProjetConstruction',
      entityId: id,
      newValue: { echeances: dto.echeances.length },
    });
    return fiche;
  }

  @Post(':id/paiements')
  @RequirePermissions('finances:creer')
  async enregistrer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePaiementChantierDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const paiement = await this.chantiers.enregistrerPaiement(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'finances.paiement_chantier_saisi',
      entityType: 'PaiementChantier',
      entityId: paiement.id,
      newValue: { montant: paiement.montant, projetId: id },
    });
    return paiement;
  }

  @Post('paiements/:paiementId/valider')
  @RequirePermissions('finances:valider')
  async valider(
    @Param('paiementId', ParseUUIDPipe) paiementId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const paiement = await this.chantiers.validerPaiement(paiementId, user);
    await this.audit.record({
      userId: user.id,
      action: 'finances.paiement_chantier_valide',
      entityType: 'PaiementChantier',
      entityId: paiementId,
      newValue: { montant: paiement.montant },
    });
    return paiement;
  }

  @Post('paiements/:paiementId/rejeter')
  @RequirePermissions('finances:valider')
  async rejeter(
    @Param('paiementId', ParseUUIDPipe) paiementId: string,
    @Body() dto: MotifDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const paiement = await this.chantiers.rejeterPaiement(
      paiementId,
      dto.motif,
      user,
    );
    await this.audit.record({
      userId: user.id,
      action: 'finances.paiement_chantier_rejete',
      entityType: 'PaiementChantier',
      entityId: paiementId,
      justification: dto.motif,
    });
    return paiement;
  }

  @Post('paiements/:paiementId/justificatif')
  @RequirePermissions('finances:creer')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_ASSET_SIZE } }),
  )
  joindre(
    @Param('paiementId', ParseUUIDPipe) paiementId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.chantiers.joindreJustificatif(paiementId, file);
  }
}
