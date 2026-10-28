import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ProprietairePortalService } from './proprietaire-portal.service';
import { LocatairePortalService } from './locataire-portal.service';
import { CreateIncidentDto } from './dto/incident.dto';
import { ResiliationsService } from './resiliations.service';
import { DemandeResiliationDto } from './dto/resiliation.dto';
import { AuditService } from '../audit/audit.service';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { MAX_ASSET_SIZE } from '../../common/storage/asset-validation';
import { DepotAssuranceDto } from './dto/assurance.dto';

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
    private readonly resiliations: ResiliationsService,
    private readonly audit: AuditService,
  ) {}

  @Authenticated()
  @Get('proprietaire/biens')
  getBiensProprietaire(@CurrentUser() user: AuthenticatedUser) {
    return this.proprietaire.getBiens(user.id);
  }

  /** Loyers appelés, encaissés et solde du portefeuille (section 15). */
  @Authenticated()
  @Get('proprietaire/synthese')
  getSyntheseProprietaire(@CurrentUser() user: AuthenticatedUser) {
    return this.proprietaire.getSynthese(user.id);
  }

  @Authenticated()
  @Get('proprietaire/documents')
  getDocumentsProprietaire(@CurrentUser() user: AuthenticatedUser) {
    return this.proprietaire.getDocuments(user.id);
  }

  @Authenticated()
  @Get('locataire/baux')
  getBauxLocataire(@CurrentUser() user: AuthenticatedUser) {
    return this.locataire.getBaux(user.id);
  }

  @Authenticated()
  @Get('locataire/paiements')
  getPaiementsLocataire(@CurrentUser() user: AuthenticatedUser) {
    return this.locataire.getPaiements(user.id);
  }

  /** Incidents et demandes : `nature` filtre l'un ou l'autre (sections 4 et 15). */
  @Authenticated()
  @Get('locataire/incidents')
  getIncidentsLocataire(
    @Query('nature') nature: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.locataire.getSignalements(user.id, nature);
  }

  /** Un locataire connecté reste un émetteur externe : même garde-fou que les formulaires publics. */
  @Authenticated()
  @Post('locataire/baux/:id/incidents')
  @Throttle({
    default: {
      limit: Number.parseInt(process.env.RESERVATION_RATE_LIMIT_MAX ?? '5', 10),
      ttl:
        Number.parseInt(process.env.RESERVATION_RATE_LIMIT_TTL ?? '60', 10) *
        1000,
    },
  })
  async signalerIncident(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateIncidentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const incident = await this.locataire.signalerIncident(user.id, id, dto);
    await this.audit.record({
      userId: user.id,
      action: 'locataire.incident.created',
      entityType: 'IncidentLocatif',
      entityId: incident.id,
      newValue: {
        bailLocatifId: id,
        nature: incident.nature,
        type: incident.type,
      },
    });
    return incident;
  }

  /**
   * Le locataire dépose son attestation d'assurance habitation (fichier + date de fin de validité). Même garde-fou
   * que les autres envois depuis l'espace client : le fichier est vérifié et l'envoi plafonné.
   */
  @Authenticated()
  @Post('locataire/assurance')
  @Throttle({
    default: {
      limit: Number.parseInt(process.env.RESERVATION_RATE_LIMIT_MAX ?? '5', 10),
      ttl:
        Number.parseInt(process.env.RESERVATION_RATE_LIMIT_TTL ?? '60', 10) *
        1000,
    },
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_ASSET_SIZE } }),
  )
  async deposerAssurance(
    @Body() dto: DepotAssuranceDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const assurance = await this.locataire.deposerAssurance(user.id, file, dto);
    await this.audit.record({
      userId: user.id,
      action: 'locataire.assurance.deposee',
      entityType: 'DocumentLocatif',
      newValue: { dateExpiration: dto.dateExpiration },
    });
    return assurance;
  }

  /** Demandes de résiliation du locataire, avec le préavis qui s'applique. */
  @Authenticated()
  @Get('locataire/resiliations')
  getResiliationsLocataire(@CurrentUser() user: AuthenticatedUser) {
    return this.resiliations.pourLocataire(user.id);
  }

  /** Le locataire demande la résiliation de son bail : MTM l'étudie, puis répond. */
  @Authenticated()
  @Post('locataire/baux/:id/resiliation')
  @Throttle({
    default: {
      limit: Number.parseInt(process.env.RESERVATION_RATE_LIMIT_MAX ?? '5', 10),
      ttl:
        Number.parseInt(process.env.RESERVATION_RATE_LIMIT_TTL ?? '60', 10) *
        1000,
    },
  })
  async demanderResiliation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DemandeResiliationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const demande = await this.resiliations.creerPourLocataire(
      user.id,
      id,
      dto,
    );
    await this.audit.record({
      userId: user.id,
      action: 'locataire.resiliation.demandee',
      entityType: 'DemandeResiliation',
      entityId: demande.id,
      newValue: {
        bailLocatifId: id,
        dateDepartSouhaitee: dto.dateDepartSouhaitee,
        motif: dto.motif,
      },
    });
    return demande;
  }

  /** Le locataire retire sa demande tant qu'elle n'est pas traitée. */
  @Authenticated()
  @Delete('locataire/resiliations/:id')
  async annulerResiliation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const demande = await this.resiliations.annulerParLocataire(user.id, id);
    await this.audit.record({
      userId: user.id,
      action: 'locataire.resiliation.annulee',
      entityType: 'DemandeResiliation',
      entityId: id,
    });
    return demande;
  }
}
