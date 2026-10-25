import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { EnregistrerVisiteDto } from './dto/enregistrer-visite.dto';
import { TYPES_FICHE, type TypeFiche } from './visites.types';
import { VisitesService } from './visites.service';

@ApiTags('visites')
@Controller('visites')
export class VisitesController {
  constructor(private readonly visites: VisitesService) {}

  /**
   * Appelé par le site public à chaque page vue. Anonyme et sans cookie ; répond toujours 204,
   * même quand la visite est ignorée (robot, adresse inconnue), pour ne rien révéler.
   */
  @Public()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Post()
  @HttpCode(204)
  async enregistrer(
    @Body() dto: EnregistrerVisiteDto,
    @Req() req: Request,
  ): Promise<void> {
    // Derrière Cloudflare, l'adresse du visiteur est dans cet en-tête ; sinon celle de la connexion.
    const cloudflare = req.headers['cf-connecting-ip'];
    const adresse =
      (Array.isArray(cloudflare) ? cloudflare[0] : cloudflare) ?? req.ip ?? '';
    await this.visites.enregistrer(dto, {
      adresse,
      userAgent: req.headers['user-agent'],
    });
  }

  /** Tableau de bord : visites, sources, fiches les plus consultées. */
  @Get('resume')
  @RequirePermissions('statistiques:consulter')
  resume(@Query('jours') jours?: string) {
    return this.visites.resume(jours);
  }

  /** Consultations d'une fiche (bien à vendre, location, réalisation ou projet). */
  @Get('bien/:type/:id')
  @RequirePermissions('statistiques:consulter')
  pourBien(
    @Param('type') type: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('jours') jours?: string,
  ) {
    if (!(TYPES_FICHE as readonly string[]).includes(type)) {
      throw new BadRequestException('Type de fiche inconnu');
    }
    return this.visites.pourBien(type as TypeFiche, id, jours);
  }
}
