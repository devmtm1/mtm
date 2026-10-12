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
import {
  CommentaireTacheDto,
  CreateTacheDto,
  QueryTachesDto,
  UpdateTacheDto,
} from './dto/tache.dto';
import { TachesService } from './taches.service';

@ApiTags('taches')
@Controller('taches')
export class TachesController {
  constructor(
    private readonly taches: TachesService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermissions('taches:consulter')
  lister(
    @Query() query: QueryTachesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.taches.lister(query, user);
  }

  @Get('resume')
  @RequirePermissions('taches:consulter')
  resume(@CurrentUser() user: AuthenticatedUser) {
    return this.taches.resume(user);
  }

  /** Collaborateurs à qui confier une tâche. */
  @Get('collaborateurs')
  @RequirePermissions('taches:consulter')
  collaborateurs() {
    return this.taches.collaborateurs();
  }

  @Get(':id')
  @RequirePermissions('taches:consulter')
  detail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.taches.detail(id, user);
  }

  @Post()
  @RequirePermissions('taches:creer')
  async creer(
    @Body() dto: CreateTacheDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const tache = await this.taches.creer(dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'tache.creee',
      entityType: 'Tache',
      entityId: tache.id,
      newValue: {
        titre: tache.titre,
        responsableId: tache.responsableId,
        entityType: tache.entityType,
        entityId: tache.entityId,
      },
    });
    return tache;
  }

  @Patch(':id')
  @RequirePermissions('taches:modifier')
  modifier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTacheDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.taches.modifier(id, dto, user);
  }

  @Post(':id/commentaires')
  @RequirePermissions('taches:modifier')
  commenter(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CommentaireTacheDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.taches.commenter(id, dto.texte, user);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions('taches:supprimer')
  async supprimer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.taches.supprimer(id);
    await this.audit.record({
      userId: user.id,
      action: 'tache.supprimee',
      entityType: 'Tache',
      entityId: id,
    });
  }
}
