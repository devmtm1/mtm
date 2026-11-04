import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
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
import { MAX_ASSET_SIZE } from '../../common/storage/asset-validation';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Public } from '../auth/decorators/public.decorator';
import { PublicCache } from '../../common/http/public-cache.decorator';
import { AuditService } from '../audit/audit.service';
import { ProgrammesService } from './programmes.service';
import { ProgrammesPilotageService } from './programmes-pilotage.service';
import { ProgrammesPublicService } from './programmes-public.service';
import { ProgrammesAssetsService } from './programmes-assets.service';
import { QueryProgrammesPublicDto } from './dto/query-programmes-public.dto';
import {
  AffecterLotsDto,
  CreateCategorieLotDto,
  CreateProgrammeMediaDto,
  CreateProgrammeDto,
  GenererLotsDto,
  StatutLotsDto,
  UpdateCategorieLotDto,
  UpdateProgrammeDto,
} from './dto/programme.dto';

@ApiTags('programmes')
@Controller('programmes')
export class ProgrammesController {
  constructor(
    private readonly programmes: ProgrammesService,
    private readonly pilotage: ProgrammesPilotageService,
    private readonly publics: ProgrammesPublicService,
    private readonly assets: ProgrammesAssetsService,
    private readonly audit: AuditService,
  ) {}

  private trace(
    user: AuthenticatedUser,
    req: Request,
    action: string,
    entityId: string,
    newValue: unknown,
  ) {
    return this.audit.record({
      userId: user.id,
      action,
      entityType: 'ProgrammeLotissement',
      entityId,
      newValue,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get() @RequirePermissions('terrains:consulter') findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('archives') archives?: string,
  ) {
    return this.programmes.findAll(archives === 'true', user);
  }

  // Lecture publique : déclarée avant « :id », sinon « public » serait pris pour un identifiant.
  @Public()
  @PublicCache()
  @Get('public')
  findPublic(@Query() query: QueryProgrammesPublicDto) {
    return this.publics.findPublic(query);
  }

  @Public()
  @PublicCache()
  @Get('public/:id')
  findPublicOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.publics.findPublicOne(id);
  }

  @Get(':id') @RequirePermissions('terrains:consulter') findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.programmes.findOne(id, user);
  }

  // Pilotage : tout ce qui tourne autour du programme. Le périmètre (ses dossiers, ses
  // prospects, ses mandats) est appliqué par le service, d'après les droits de chaque module.
  @Get(':id/ventes') @RequirePermissions('terrains:consulter') ventes(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pilotage.ventes(id, user);
  }

  @Get(':id/visites') @RequirePermissions('terrains:consulter') visites(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pilotage.visites(id, user);
  }

  @Get(':id/mandats') @RequirePermissions('terrains:consulter') mandats(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pilotage.mandats(id, user);
  }

  @Get(':id/documents') @RequirePermissions('terrains:consulter') documents(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pilotage.documents(id, user);
  }

  // Visuels du site public : photos (la première est la couverture) et plan de masse.
  @Get(':id/medias') @RequirePermissions('terrains:consulter') medias(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assets.lister(id);
  }

  @Post(':id/medias')
  @RequirePermissions('terrains:modifier')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_ASSET_SIZE } }),
  )
  async ajouterMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProgrammeMediaDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('Un fichier est obligatoire');
    const media = await this.assets.ajouter(id, dto, file, user);
    await this.trace(user, req, 'programme.media_ajoute', id, {
      mediaId: media.id,
      type: dto.type,
    });
    return media;
  }

  @Post(':id/medias/:mediaId/couverture')
  @RequirePermissions('terrains:modifier')
  async couverture(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const media = await this.assets.definirCouverture(id, mediaId);
    await this.trace(user, req, 'programme.couverture_definie', id, {
      mediaId,
    });
    return media;
  }

  @Delete(':id/medias/:mediaId')
  @RequirePermissions('terrains:modifier')
  async supprimerMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    await this.assets.supprimer(id, mediaId);
    await this.trace(user, req, 'programme.media_supprime', id, { mediaId });
    return { deleted: true };
  }

  @Post() @RequirePermissions('terrains:creer') async create(
    @Body() dto: CreateProgrammeDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const programme = await this.programmes.create(dto, user);
    await this.trace(user, req, 'programme.created', programme.id, programme);
    return programme;
  }

  @Patch(':id') @RequirePermissions('terrains:modifier') async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProgrammeDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const programme = await this.programmes.update(id, dto, user);
    // La justification d'un changement de commission, de marge ou de propriétaire reste au journal.
    await this.trace(user, req, 'programme.updated', id, {
      ...programme,
      ...(dto.justification ? { justification: dto.justification } : {}),
    });
    return programme;
  }

  @Post(':id/archiver')
  @RequirePermissions('terrains:modifier')
  async archiver(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const programme = await this.programmes.archiver(id);
    await this.trace(user, req, 'programme.archived', id, {});
    return programme;
  }

  @Post(':id/restaurer')
  @RequirePermissions('terrains:modifier')
  async restaurer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const programme = await this.programmes.restaurer(id);
    await this.trace(user, req, 'programme.restored', id, {});
    return programme;
  }

  @Post(':id/lots/generer')
  @RequirePermissions('terrains:creer')
  async generer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GenererLotsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const resultat = await this.programmes.genererLots(id, dto, user);
    await this.trace(user, req, 'programme.lots_generes', id, {
      ...dto,
      ...resultat,
    });
    return resultat;
  }

  /** Recopie les conditions du programme sur tous ses lots libres (prix, paiement, commission ou marge). */
  @Post(':id/lots/appliquer')
  @RequirePermissions('terrains:modifier')
  async appliquerAuProgramme(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const resultat = await this.programmes.appliquerProgramme(id);
    await this.trace(user, req, 'programme.lots_appliques', id, resultat);
    return resultat;
  }

  @Post(':id/lots/affecter')
  @RequirePermissions('terrains:modifier')
  async affecter(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AffecterLotsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const resultat = await this.programmes.affecterLots(id, dto);
    await this.trace(user, req, 'programme.lots_affectes', id, {
      ...dto,
      ...resultat,
    });
    return resultat;
  }

  @Post(':id/lots/statut')
  @RequirePermissions('terrains:modifier')
  async statut(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StatutLotsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const resultat = await this.programmes.changerStatut(id, dto);
    await this.trace(user, req, 'programme.lots_statut', id, {
      ...dto,
      ...resultat,
    });
    return resultat;
  }

  @Post(':id/categories')
  @RequirePermissions('terrains:modifier')
  creerCategorie(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCategorieLotDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.programmes.creerCategorie(id, dto, user);
  }

  @Patch('categories/:categorieId')
  @RequirePermissions('terrains:modifier')
  modifierCategorie(
    @Param('categorieId', ParseUUIDPipe) categorieId: string,
    @Body() dto: UpdateCategorieLotDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.programmes.modifierCategorie(categorieId, dto, user);
  }

  @Post('categories/:categorieId/appliquer')
  @RequirePermissions('terrains:modifier')
  async appliquer(
    @Param('categorieId', ParseUUIDPipe) categorieId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const resultat = await this.programmes.appliquerCategorie(categorieId);
    await this.trace(
      user,
      req,
      'programme.categorie_appliquee',
      categorieId,
      resultat,
    );
    return resultat;
  }

  @Delete('categories/:categorieId')
  @RequirePermissions('terrains:modifier')
  supprimerCategorie(@Param('categorieId', ParseUUIDPipe) categorieId: string) {
    return this.programmes.supprimerCategorie(categorieId);
  }
}
