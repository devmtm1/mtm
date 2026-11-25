import {
  BadRequestException,
  Body,
  Controller,
  Get,
  ParseEnumPipe,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { MAX_ASSET_SIZE } from '../../common/storage/asset-validation';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import {
  AccepterProtocoleDto,
  ChangerStatutProtocoleDto,
  CreateProtocoleDto,
  DeposerDocumentProtocoleDto,
  ListerProtocolesDto,
} from './dto/protocoles.dto';
import { AuditService } from '../audit/audit.service';
import { ProtocolesService } from './protocoles.service';
import {
  LIBELLES_STATUT,
  MOYENS_ENVOI,
  TRANSITIONS,
  TYPES_PROTOCOLE,
} from './protocoles.regles';

@ApiTags('protocoles')
@Controller('protocoles')
export class ProtocolesController {
  constructor(
    private readonly protocoles: ProtocolesService,
    private readonly audit: AuditService,
  ) {}

  /** Libellés et valeurs que le back-office affiche (statuts, types, moyens d'envoi). */
  @Get('options')
  @RequirePermissions('protocoles:consulter')
  options() {
    return {
      statuts: Object.entries(LIBELLES_STATUT).map(([valeur, libelle]) => ({
        valeur,
        libelle,
      })),
      types: TYPES_PROTOCOLE,
      moyensEnvoi: MOYENS_ENVOI,
      transitions: TRANSITIONS,
    };
  }

  /** Les collaborateurs responsables des dossiers suivis (filtre du tableau de bord). */
  @Get('responsables')
  @RequirePermissions('protocoles:consulter')
  responsables() {
    return this.protocoles.responsables();
  }

  /** Les baux et chantiers auxquels on peut rattacher un protocole : le choix de la fenêtre « Nouveau protocole ». */
  @Get('dossiers-possibles')
  @RequirePermissions('protocoles:creer')
  dossiersPossibles(
    @Query('type', new ParseEnumPipe(['bail', 'chantier']))
    type: 'bail' | 'chantier',
    @Query('q') q?: string,
  ) {
    return this.protocoles.dossiersPossibles(type, q);
  }

  /** Espace client : les protocoles de ses baux et chantiers. */
  @Authenticated()
  @Get('client/mes-protocoles')
  mesProtocoles(@CurrentUser() user: AuthenticatedUser) {
    return this.protocoles.mesProtocolesAutres(user.id);
  }

  /** Espace client : le client connecté accepte son protocole en ligne (si MTM l'a activé). */
  @Authenticated()
  @Post('client/:id/accepter')
  accepterEnLigne(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AccepterProtocoleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.protocoles.accepterEnLigne(user.id, id, dto.nom, {
      ip: req.ip,
      agent: req.headers['user-agent'],
    });
  }

  @Get('tableau')
  @RequirePermissions('protocoles:consulter')
  tableau(@Query() query: ListerProtocolesDto) {
    return this.protocoles.tableau(query);
  }

  @Get('alertes')
  @RequirePermissions('protocoles:consulter')
  alertes(@Query() query: ListerProtocolesDto) {
    return this.protocoles.alertes(query);
  }

  @Get()
  @RequirePermissions('protocoles:consulter')
  lister(@Query() query: ListerProtocolesDto) {
    return this.protocoles.lister(query);
  }

  @Get(':id')
  @RequirePermissions('protocoles:consulter')
  async detail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const protocole = await this.protocoles.detail(id);
    // Consultation d'un dossier contractuel et financier : tracée (qui l'a ouvert, quand), comme les dépôts et les changements.
    await this.audit.record({
      userId: user.id,
      action: 'protocole.viewed',
      entityType: 'ProtocoleDossier',
      entityId: id,
    });
    return protocole;
  }

  @Post()
  @RequirePermissions('protocoles:creer')
  creer(
    @Body() dto: CreateProtocoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.protocoles.creer(dto, user);
  }

  @Patch(':id/statut')
  @RequirePermissions('protocoles:modifier')
  changerStatut(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangerStatutProtocoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.protocoles.changerStatut(id, dto, user);
  }

  @Post(':id/documents')
  @RequirePermissions('protocoles:modifier')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_ASSET_SIZE } }),
  )
  deposerDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeposerDocumentProtocoleDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Un document est obligatoire');
    return this.protocoles.deposerDocument(id, dto, file, user);
  }
}
