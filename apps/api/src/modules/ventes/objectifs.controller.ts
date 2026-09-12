import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { UpsertObjectifDto } from './dto/upsert-objectif.dto';
import { ObjectifsService } from './objectifs.service';

/**
 * Objectifs commerciaux mensuels. Déclaré avant les routes `/ventes/:id` du
 * contrôleur principal pour que `/ventes/objectifs` ne soit pas capturé
 * comme un identifiant de dossier.
 */
@ApiTags('ventes')
@Controller('ventes/objectifs')
export class ObjectifsController {
  constructor(private readonly objectifs: ObjectifsService) {}

  @Get()
  @RequirePermissions('ventes:consulter')
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('periode') periode?: string,
  ) {
    return this.objectifs.findAll(user, periode);
  }

  /** Suivi objectif / réalisé d'un commercial pour un mois (défaut : mois courant). */
  @Get('progression/:commercialId')
  @RequirePermissions('ventes:consulter')
  getProgress(
    @Param('commercialId', ParseUUIDPipe) commercialId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('periode') periode?: string,
  ) {
    return this.objectifs.getProgress(
      commercialId,
      periode ?? ObjectifsService.currentPeriode(),
      user,
    );
  }

  /** Fixe (ou remplace) l'objectif d'un commercial pour un mois — acte de management. */
  @Put()
  @RequirePermissions('ventes:administrer')
  upsert(
    @Body() dto: UpsertObjectifDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.objectifs.upsert(dto, user);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions('ventes:administrer')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.objectifs.remove(id, user);
  }
}
