import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { SejoursService } from './sejours.service';
import {
  AnnulerSejourDto,
  CreatePaiementSejourDto,
  CreateSejourDto,
  QuerySejourDto,
  RestituerCautionSejourDto,
  TransitionSejourDto,
  UpdateSejourDto,
  VerserCautionSejourDto,
} from './dto/sejour.dto';

/**
 * Séjours de courte durée (location type Airbnb). Les routes littérales
 * (`stats`) sont déclarées avant celles à paramètre. Encaisser un règlement ou
 * rendre une caution relève de la permission « payer », comme pour les loyers.
 */
@ApiTags('locatif')
@Controller('locatif/sejours')
export class SejoursController {
  constructor(
    private readonly sejours: SejoursService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermissions('locatif:consulter')
  findAll(
    @Query() query: QuerySejourDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sejours.findAll(query, user);
  }

  @Get('stats')
  @RequirePermissions('locatif:consulter')
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.sejours.stats(user);
  }

  @Get(':id')
  @RequirePermissions('locatif:consulter')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sejours.findOne(id, user);
  }

  @Post()
  @RequirePermissions('locatif:creer')
  async create(
    @Body() dto: CreateSejourDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const sejour = await this.sejours.create(dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'sejour.created',
      entityType: 'SejourLocatif',
      entityId: sejour.id,
      newValue: {
        reference: sejour.referenceInterne,
        bienLocatifId: dto.bienLocatifId,
        dateArrivee: dto.dateArrivee,
        dateDepart: dto.dateDepart,
        statut: sejour.statut,
      },
    });
    return sejour;
  }

  @Patch(':id')
  @RequirePermissions('locatif:modifier')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSejourDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const sejour = await this.sejours.update(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'sejour.updated',
      entityType: 'SejourLocatif',
      entityId: id,
      newValue: dto,
    });
    return sejour;
  }

  @Patch(':id/statut')
  @RequirePermissions('locatif:modifier')
  async changerStatut(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionSejourDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const sejour = await this.sejours.changerStatut(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'sejour.statut',
      entityType: 'SejourLocatif',
      entityId: id,
      newValue: { statut: dto.statut },
    });
    return sejour;
  }

  @Post(':id/annuler')
  @RequirePermissions('locatif:modifier')
  async annuler(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AnnulerSejourDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const sejour = await this.sejours.annuler(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'sejour.annule',
      entityType: 'SejourLocatif',
      entityId: id,
      justification: dto.motif,
    });
    return sejour;
  }

  @Post(':id/paiements')
  @RequirePermissions('locatif:payer')
  async ajouterPaiement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePaiementSejourDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const sejour = await this.sejours.ajouterPaiement(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'sejour.paiement.enregistre',
      entityType: 'SejourLocatif',
      entityId: id,
      newValue: {
        montant: dto.montant,
        mode: dto.mode,
        reference: dto.reference,
      },
    });
    return sejour;
  }

  @Delete(':id/paiements/:paiementId')
  @RequirePermissions('locatif:valider')
  async supprimerPaiement(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('paiementId', ParseUUIDPipe) paiementId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const sejour = await this.sejours.supprimerPaiement(id, paiementId, user);
    await this.audit.record({
      userId: user.id,
      action: 'sejour.paiement.supprime',
      entityType: 'SejourLocatif',
      entityId: id,
      oldValue: { paiementId },
      justification: 'Suppression d’un règlement de séjour',
    });
    return sejour;
  }

  @Post(':id/caution/verser')
  @RequirePermissions('locatif:payer')
  async verserCaution(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerserCautionSejourDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const sejour = await this.sejours.verserCaution(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'sejour.caution.versee',
      entityType: 'SejourLocatif',
      entityId: id,
      newValue: { montant: dto.montant },
    });
    return sejour;
  }

  @Post(':id/caution/restituer')
  @RequirePermissions('locatif:payer')
  async restituerCaution(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RestituerCautionSejourDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const sejour = await this.sejours.restituerCaution(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'sejour.caution.restituee',
      entityType: 'SejourLocatif',
      entityId: id,
      newValue: { retenue: dto.retenue ?? 0 },
      justification: dto.justification,
    });
    return sejour;
  }
}
