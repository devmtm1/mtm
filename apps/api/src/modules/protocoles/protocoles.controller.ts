import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { MAX_ASSET_SIZE } from '../../common/storage/asset-validation';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import {
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
