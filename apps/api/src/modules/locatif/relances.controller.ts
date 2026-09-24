import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { RelancesLoyerService } from './relances.service';
import { EnvoyerRelanceDto, QueryRelanceDto } from './dto/relance.dto';

/**
 * File de relances de loyer (section 15 : « modèles configurables et
 * calendrier de relance »). Le calendrier alimente la file chaque nuit ; le
 * gestionnaire envoie, marque ou abandonne, et chaque geste laisse une trace.
 */
@ApiTags('locatif')
@Controller('locatif/relances')
export class RelancesController {
  constructor(
    private readonly relances: RelancesLoyerService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermissions('locatif:consulter')
  findAll(
    @Query() query: QueryRelanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.relances.findAll(query, user);
  }

  @Get('compteur')
  @RequirePermissions('locatif:consulter')
  async countAEnvoyer(@CurrentUser() user: AuthenticatedUser) {
    return { aEnvoyer: await this.relances.countAEnvoyer(user) };
  }

  @Post(':id/envoyer')
  @RequirePermissions('locatif:modifier')
  async envoyer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EnvoyerRelanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const relance = await this.relances.envoyer(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'bail.relance.envoyee',
      entityType: 'RelanceLoyer',
      entityId: id,
      newValue: {
        bailLocatifId: relance.bailLocatifId,
        modele: relance.modeleCode,
        canal: relance.canal,
        joursRetard: relance.joursRetard,
      },
    });
    return relance;
  }

  @Post(':id/annuler')
  @RequirePermissions('locatif:modifier')
  async annuler(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const relance = await this.relances.annuler(id, user);
    await this.audit.record({
      userId: user.id,
      action: 'bail.relance.annulee',
      entityType: 'RelanceLoyer',
      entityId: id,
      oldValue: { modele: relance.modeleCode },
    });
    return relance;
  }
}
