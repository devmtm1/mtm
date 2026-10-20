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
import {
  CloturerCaisseDto,
  CreateCompteDto,
  CreateMouvementFondsDto,
  DecisionEcartDto,
  MotifDto,
  QueryCloturesCaisseDto,
  QueryMouvementsDto,
  QuerySoldesDto,
  UpdateCompteDto,
} from './dto/tresorerie.dto';
import { TresorerieService } from './tresorerie.service';

/**
 * Trésorerie : comptes (caisse, banques, Wave, Orange Money), soldes, remises
 * de fonds sur bordereau, transferts et clôture quotidienne de la caisse.
 * Lecture avec « finances:consulter », saisie avec « creer », confirmation
 * avec « valider », décision sur un écart par la Direction.
 */
@ApiTags('finances')
@Controller('finances')
export class TresorerieController {
  constructor(
    private readonly tresorerie: TresorerieService,
    private readonly audit: AuditService,
  ) {}

  // --- comptes et soldes ---

  @Get('mon-pouvoir')
  @RequirePermissions('finances:consulter')
  pouvoir(@CurrentUser() user: AuthenticatedUser) {
    return this.tresorerie.pouvoir(user);
  }

  @Get('soldes')
  @RequirePermissions('finances:consulter')
  soldes(@Query() query: QuerySoldesDto) {
    return this.tresorerie.soldes(query.au);
  }

  @Post('comptes')
  @RequirePermissions('finances:administrer')
  async creerCompte(
    @Body() dto: CreateCompteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const compte = await this.tresorerie.creerCompte(dto);
    await this.audit.record({
      userId: user.id,
      action: 'finances.compte_cree',
      entityType: 'CompteTresorerie',
      entityId: compte.id,
      newValue: { code: compte.code, type: compte.type, modes: compte.modes },
    });
    return compte;
  }

  @Patch('comptes/:id')
  @RequirePermissions('finances:administrer')
  async modifierCompte(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const compte = await this.tresorerie.modifierCompte(id, dto);
    await this.audit.record({
      userId: user.id,
      action: 'finances.compte_modifie',
      entityType: 'CompteTresorerie',
      entityId: id,
      newValue: dto,
    });
    return compte;
  }

  // --- remises de fonds, avances, remboursements, transferts ---

  @Get('mouvements-fonds')
  @RequirePermissions('finances:consulter')
  mouvements(@Query() query: QueryMouvementsDto) {
    return this.tresorerie.listerMouvements(query);
  }

  @Post('mouvements-fonds')
  @RequirePermissions('finances:creer')
  async creerMouvement(
    @Body() dto: CreateMouvementFondsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const mouvement = await this.tresorerie.creerMouvement(dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'finances.mouvement_fonds',
      entityType: 'MouvementFonds',
      entityId: mouvement.id,
      newValue: {
        type: mouvement.type,
        montant: mouvement.montant,
        motif: mouvement.motif,
      },
    });
    return mouvement;
  }

  @Post('mouvements-fonds/:id/confirmer')
  @RequirePermissions('finances:valider')
  async confirmerMouvement(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const mouvement = await this.tresorerie.confirmerMouvement(id, user);
    await this.audit.record({
      userId: user.id,
      action: 'finances.mouvement_fonds_confirme',
      entityType: 'MouvementFonds',
      entityId: id,
      newValue: { montant: mouvement.montant, type: mouvement.type },
    });
    return mouvement;
  }

  @Post('mouvements-fonds/:id/rejeter')
  @RequirePermissions('finances:valider')
  async rejeterMouvement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MotifDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const mouvement = await this.tresorerie.rejeterMouvement(
      id,
      dto.motif,
      user,
    );
    await this.audit.record({
      userId: user.id,
      action: 'finances.mouvement_fonds_rejete',
      entityType: 'MouvementFonds',
      entityId: id,
      justification: dto.motif,
    });
    return mouvement;
  }

  @Post('mouvements-fonds/:id/justificatif')
  @RequirePermissions('finances:modifier')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_ASSET_SIZE } }),
  )
  joindreMouvement(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.tresorerie.joindreJustificatifMouvement(id, file);
  }

  @Delete('mouvements-fonds/:id')
  @HttpCode(204)
  @RequirePermissions('finances:modifier')
  async supprimerMouvement(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    try {
      await this.tresorerie.supprimerMouvement(id, user);
    } catch (error) {
      // Une tentative de supprimer un mouvement confirmé reste dans le journal.
      await this.audit.record({
        userId: user.id,
        action: 'finances.suppression_refusee',
        entityType: 'MouvementFonds',
        entityId: id,
      });
      throw error;
    }
    await this.audit.record({
      userId: user.id,
      action: 'finances.mouvement_fonds_supprime',
      entityType: 'MouvementFonds',
      entityId: id,
    });
  }

  // --- clôture quotidienne de la caisse ---

  @Get('clotures-caisse')
  @RequirePermissions('finances:consulter')
  clotures(@Query() query: QueryCloturesCaisseDto) {
    return this.tresorerie.listerCloturesCaisse(query);
  }

  @Get('clotures-caisse/manquantes')
  @RequirePermissions('finances:consulter')
  manquantes() {
    return this.tresorerie.joursNonClotures();
  }

  @Post('clotures-caisse')
  @RequirePermissions('finances:creer')
  async cloturerCaisse(
    @Body() dto: CloturerCaisseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const cloture = await this.tresorerie.cloturerCaisse(dto, user);
    await this.audit.record({
      userId: user.id,
      action:
        cloture.ecart === 0
          ? 'finances.cloture_caisse'
          : 'finances.ecart_caisse',
      entityType: 'ClotureCaisse',
      entityId: cloture.id,
      newValue: {
        compte: cloture.compte.nom,
        date: dto.date,
        soldeTheorique: cloture.soldeTheorique,
        montantCompte: cloture.montantCompte,
        ecart: cloture.ecart,
      },
      justification: cloture.explication ?? undefined,
    });
    return cloture;
  }

  @Post('clotures-caisse/:id/decision')
  @RequirePermissions('finances:consulter')
  async decider(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecisionEcartDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const cloture = await this.tresorerie.deciderEcart(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'finances.ecart_caisse_decide',
      entityType: 'ClotureCaisse',
      entityId: id,
      newValue: { decision: dto.decision, ecart: cloture.ecart },
      justification: dto.motif,
    });
    return cloture;
  }

  @Post('clotures-caisse/:id/justificatif')
  @RequirePermissions('finances:creer')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_ASSET_SIZE } }),
  )
  joindreCloture(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.tresorerie.joindreJustificatifCloture(id, file);
  }
}
