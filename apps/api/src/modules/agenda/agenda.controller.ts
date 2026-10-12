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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuditService } from '../audit/audit.service';
import { AgendaService } from './agenda.service';
import {
  CreateEvenementDto,
  QueryAgendaDto,
  UpdateEvenementDto,
} from './dto/agenda.dto';

@ApiTags('agenda')
@Controller('agenda')
export class AgendaController {
  constructor(
    private readonly agenda: AgendaService,
    private readonly audit: AuditService,
  ) {}

  /** Tout ce qui tombe dans la période : événements saisis et échéances des autres modules. */
  @Get()
  @RequirePermissions('agenda:consulter')
  flux(@Query() query: QueryAgendaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.agenda.flux(query, user);
  }

  @Get('collaborateurs')
  @RequirePermissions('agenda:consulter')
  collaborateurs() {
    return this.agenda.collaborateurs();
  }

  @Get('evenements/:id')
  @RequirePermissions('agenda:consulter')
  detail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.agenda.detail(id, user);
  }

  @Post('evenements')
  @RequirePermissions('agenda:creer')
  async creer(
    @Body() dto: CreateEvenementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const evenement = await this.agenda.creer(dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'agenda.evenement_cree',
      entityType: 'EvenementAgenda',
      entityId: evenement.id,
      newValue: { type: evenement.type, titre: evenement.titre },
    });
    return evenement;
  }

  @Patch('evenements/:id')
  @RequirePermissions('agenda:modifier')
  modifier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEvenementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.agenda.modifier(id, dto, user);
  }

  @Delete('evenements/:id')
  @HttpCode(204)
  @RequirePermissions('agenda:modifier')
  async supprimer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.agenda.supprimer(id, user);
    await this.audit.record({
      userId: user.id,
      action: 'agenda.evenement_supprime',
      entityType: 'EvenementAgenda',
      entityId: id,
    });
  }
}
