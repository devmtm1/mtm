import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import {
  MotifDto,
  QueryRapprochementDto,
  RapprocherDto,
} from './dto/tresorerie.dto';
import { RapprochementService } from './rapprochement.service';

/** Un relevé de banque dépasse rarement quelques centaines de ko : 2 Mo suffisent, le service re-vérifie. */
const TAILLE_RELEVE = 2 * 1024 * 1024;

/**
 * Rapprochement bancaire : relevés de la banque, de Wave et d'Orange Money mis
 * en face des mouvements du logiciel. Lecture avec « finances:consulter »,
 * import avec « creer », rapprochement avec « valider ».
 */
@ApiTags('finances')
@Controller('finances/rapprochement')
export class RapprochementController {
  constructor(
    private readonly rapprochement: RapprochementService,
    private readonly audit: AuditService,
  ) {}

  @Get(':compteId')
  @RequirePermissions('finances:consulter')
  etat(
    @Param('compteId', ParseUUIDPipe) compteId: string,
    @Query() query: QueryRapprochementDto,
  ) {
    return this.rapprochement.etat(compteId, query.du, query.au);
  }

  @Post(':compteId/import')
  @RequirePermissions('finances:creer')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: TAILLE_RELEVE } }),
  )
  async importer(
    @Param('compteId', ParseUUIDPipe) compteId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const resultat = await this.rapprochement.importer(compteId, file, user);
    await this.audit.record({
      userId: user.id,
      action: 'finances.releve_importe',
      entityType: 'CompteTresorerie',
      entityId: compteId,
      newValue: {
        fichier: file?.originalname,
        lues: resultat.lues,
        importees: resultat.importees,
        dejaImportees: resultat.dejaImportees,
        erreurs: resultat.erreurs.length,
      },
    });
    return resultat;
  }

  @Post(':compteId/auto')
  @RequirePermissions('finances:valider')
  async automatique(
    @Param('compteId', ParseUUIDPipe) compteId: string,
    @Body() body: QueryRapprochementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const resultat = await this.rapprochement.rapprocherAutomatiquement(
      compteId,
      body.du,
      body.au,
      user,
    );
    await this.audit.record({
      userId: user.id,
      action: 'finances.rapprochement_automatique',
      entityType: 'CompteTresorerie',
      entityId: compteId,
      newValue: resultat,
    });
    return resultat;
  }

  @Post('lignes/:id/rapprocher')
  @RequirePermissions('finances:valider')
  async rapprocher(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RapprocherDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const ligne = await this.rapprochement.rapprocher(
      id,
      dto.mouvementId,
      user,
    );
    await this.audit.record({
      userId: user.id,
      action: 'finances.rapprochement',
      entityType: 'ReleveLigne',
      entityId: id,
      newValue: { mouvementId: dto.mouvementId, montant: ligne.montant },
    });
    return ligne;
  }

  @Post('lignes/:id/ignorer')
  @RequirePermissions('finances:valider')
  async ignorer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MotifDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const ligne = await this.rapprochement.ignorer(id, dto.motif, user);
    await this.audit.record({
      userId: user.id,
      action: 'finances.rapprochement_ignore',
      entityType: 'ReleveLigne',
      entityId: id,
      newValue: { montant: ligne.montant },
      justification: dto.motif,
    });
    return ligne;
  }

  @Post('lignes/:id/annuler')
  @RequirePermissions('finances:valider')
  async annuler(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const ligne = await this.rapprochement.annuler(id);
    await this.audit.record({
      userId: user.id,
      action: 'finances.rapprochement_annule',
      entityType: 'ReleveLigne',
      entityId: id,
    });
    return ligne;
  }
}
