import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { MAX_ASSET_SIZE } from '../../common/storage/asset-validation';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { EtatsDesLieuxService } from './etats-des-lieux.service';
import { EtatDesLieuxDto } from './dto/etat-des-lieux.dto';

/**
 * États des lieux d'entrée et de sortie d'un séjour ou d'un bail, avec leurs
 * photos. Le type (« entree » ou « sortie ») est dans l'URL : réenregistrer le
 * même type corrige l'état des lieux existant.
 */
@ApiTags('locatif')
@Controller('locatif')
export class EtatsDesLieuxController {
  constructor(
    private readonly etats: EtatsDesLieuxService,
    private readonly audit: AuditService,
  ) {}

  @Get('sejours/:id/etats-des-lieux')
  @RequirePermissions('locatif:consulter')
  lireSejour(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.etats.lire({ sejourId: id }, user);
  }

  @Put('sejours/:id/etats-des-lieux/:type')
  @RequirePermissions('locatif:modifier')
  async enregistrerSejour(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('type') type: string,
    @Body() dto: EtatDesLieuxDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const resultat = await this.etats.enregistrer(
      { sejourId: id },
      type,
      dto,
      user,
    );
    await this.audit.record({
      userId: user.id,
      action: 'etat_des_lieux.enregistre',
      entityType: 'SejourLocatif',
      entityId: id,
      newValue: { type, pieces: dto.pieces.length },
    });
    return resultat;
  }

  @Get('baux/:id/etats-des-lieux')
  @RequirePermissions('locatif:consulter')
  lireBail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.etats.lire({ bailLocatifId: id }, user);
  }

  @Put('baux/:id/etats-des-lieux/:type')
  @RequirePermissions('locatif:modifier')
  async enregistrerBail(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('type') type: string,
    @Body() dto: EtatDesLieuxDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const resultat = await this.etats.enregistrer(
      { bailLocatifId: id },
      type,
      dto,
      user,
    );
    await this.audit.record({
      userId: user.id,
      action: 'etat_des_lieux.enregistre',
      entityType: 'BailLocatif',
      entityId: id,
      newValue: { type, pieces: dto.pieces.length },
    });
    return resultat;
  }

  @Post('etats-des-lieux/:etatId/photos')
  @RequirePermissions('locatif:modifier')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_ASSET_SIZE } }),
  )
  async ajouterPhoto(
    @Param('etatId', ParseUUIDPipe) etatId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('legende') legende: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const resultat = await this.etats.ajouterPhoto(etatId, file, legende, user);
    await this.audit.record({
      userId: user.id,
      action: 'etat_des_lieux.photo.ajoutee',
      entityType: 'EtatDesLieux',
      entityId: etatId,
    });
    return resultat;
  }

  @Delete('etats-des-lieux/:etatId/photos/:photoId')
  @RequirePermissions('locatif:modifier')
  async supprimerPhoto(
    @Param('etatId', ParseUUIDPipe) etatId: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const resultat = await this.etats.supprimerPhoto(etatId, photoId, user);
    await this.audit.record({
      userId: user.id,
      action: 'etat_des_lieux.photo.supprimee',
      entityType: 'EtatDesLieux',
      entityId: etatId,
    });
    return resultat;
  }
}
