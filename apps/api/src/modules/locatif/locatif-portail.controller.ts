import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ProprietairePortalService } from './proprietaire-portal.service';
import { LocatairePortalService } from './locataire-portal.service';
import { CreateIncidentDto } from './dto/incident.dto';

/**
 * Espaces propriétaire et locataire (J2.1, sections 4 et 15 du cahier des
 * charges). Aucune permission requise au-delà de l'authentification : le
 * périmètre vient du compte, comme pour l'espace client des ventes et des
 * démarches.
 */
@ApiTags('locatif')
@Controller('locatif')
export class LocatifPortailController {
  constructor(
    private readonly proprietaire: ProprietairePortalService,
    private readonly locataire: LocatairePortalService,
  ) {}

  @Get('proprietaire/biens')
  getBiensProprietaire(@CurrentUser() user: AuthenticatedUser) {
    return this.proprietaire.getBiens(user.id);
  }

  /** Loyers appelés, encaissés et solde du portefeuille (section 15). */
  @Get('proprietaire/synthese')
  getSyntheseProprietaire(@CurrentUser() user: AuthenticatedUser) {
    return this.proprietaire.getSynthese(user.id);
  }

  @Get('proprietaire/documents')
  getDocumentsProprietaire(@CurrentUser() user: AuthenticatedUser) {
    return this.proprietaire.getDocuments(user.id);
  }

  @Get('locataire/baux')
  getBauxLocataire(@CurrentUser() user: AuthenticatedUser) {
    return this.locataire.getBaux(user.id);
  }

  @Get('locataire/paiements')
  getPaiementsLocataire(@CurrentUser() user: AuthenticatedUser) {
    return this.locataire.getPaiements(user.id);
  }

  /** Incidents et demandes : `nature` filtre l'un ou l'autre (sections 4 et 15). */
  @Get('locataire/incidents')
  getIncidentsLocataire(
    @Query('nature') nature: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.locataire.getSignalements(user.id, nature);
  }

  /** Un locataire connecté reste un émetteur externe : même garde-fou que les formulaires publics. */
  @Post('locataire/baux/:id/incidents')
  @Throttle({
    default: {
      limit: Number.parseInt(process.env.RESERVATION_RATE_LIMIT_MAX ?? '5', 10),
      ttl:
        Number.parseInt(process.env.RESERVATION_RATE_LIMIT_TTL ?? '60', 10) *
        1000,
    },
  })
  signalerIncident(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateIncidentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.locataire.signalerIncident(user.id, id, dto);
  }
}
