import {
  Body,
  Controller,
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
import { ResiliationsService } from './resiliations.service';
import {
  DemandeResiliationStaffDto,
  QueryResiliationDto,
  TraiterResiliationDto,
} from './dto/resiliation.dto';

/** Demandes de résiliation de bail : à traiter par la gestion locative. */
@ApiTags('locatif')
@Controller('locatif/resiliations')
export class ResiliationsController {
  constructor(
    private readonly resiliations: ResiliationsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermissions('locatif:consulter')
  findAll(
    @Query() query: QueryResiliationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.resiliations.findAll(query, user);
  }

  @Get('stats')
  @RequirePermissions('locatif:consulter')
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.resiliations.stats(user);
  }

  /** Enregistre une demande reçue par téléphone, WhatsApp ou courrier. */
  @Post('baux/:bailId')
  @RequirePermissions('locatif:modifier')
  async creer(
    @Param('bailId', ParseUUIDPipe) bailId: string,
    @Body() dto: DemandeResiliationStaffDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const demande = await this.resiliations.creerParStaff(bailId, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'resiliation.demande.enregistree',
      entityType: 'DemandeResiliation',
      entityId: demande.id,
      newValue: {
        bailLocatifId: bailId,
        canal: demande.canal,
        dateDepartSouhaitee: dto.dateDepartSouhaitee,
      },
    });
    return demande;
  }

  @Patch(':id/traiter')
  @RequirePermissions('locatif:modifier')
  async traiter(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TraiterResiliationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const demande = await this.resiliations.traiter(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action:
        dto.decision === 'acceptee'
          ? 'resiliation.acceptee'
          : 'resiliation.refusee',
      entityType: 'DemandeResiliation',
      entityId: id,
      newValue: {
        dateDepartRetenue: demande.dateDepartRetenue,
        reponse: demande.reponse,
      },
    });
    return demande;
  }
}
