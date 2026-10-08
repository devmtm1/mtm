import {
  Body,
  BadRequestException,
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
import { ApiTags } from '@nestjs/swagger';
import { MAX_ASSET_SIZE } from '../../common/storage/asset-validation';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { PublicCache } from '../../common/http/public-cache.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { CreateTerrainDto } from './dto/create-terrain.dto';
import { QueryTerrainDto } from './dto/query-terrain.dto';
import { UpdateTerrainDto } from './dto/update-terrain.dto';
import { UpdateTerrainStatusDto } from './dto/update-terrain-status.dto';
import { CreateTerrainAssetDto } from './dto/create-terrain-asset.dto';
import { TerrainsService } from './terrains.service';
import { TerrainsPublicService } from './terrains-public.service';
import { ArchiveTerrainDto } from './dto/archive-terrain.dto';
import { CreateTerrainNoteDto } from './dto/create-terrain-note.dto';
import { UpdateReferenceVendueDto } from './dto/update-reference-vendue.dto';
import { TerrainsAssetsService } from './terrains-assets.service';
import { TerrainsImportService } from './import/terrains-import.service';
import { ImportTerrainsDto } from './dto/import-terrains.dto';
import { MAX_TAILLE_IMPORT } from './import/lecture-tableur';

@ApiTags('terrains')
@Controller('terrains')
export class TerrainsController {
  constructor(
    private readonly terrains: TerrainsService,
    private readonly publicCatalog: TerrainsPublicService,
    private readonly assets: TerrainsAssetsService,
    private readonly importation: TerrainsImportService,
    private readonly audit: AuditService,
  ) {}

  @Public()
  @PublicCache()
  @Get('public')
  findPublic(@Query() query: QueryTerrainDto) {
    return this.publicCatalog.findPublic(query);
  }

  /**
   * Options de filtres du catalogue public. Déclaré avant `public/:id` pour
   * que « options » ne soit pas capté comme un identifiant.
   */
  @Public()
  @PublicCache()
  @Get('public/options')
  getPublicFilterOptions() {
    return this.publicCatalog.getPublicFilterOptions();
  }

  @Public()
  @PublicCache()
  @Get('public/:id')
  findPublicOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.publicCatalog.findPublicOne(id);
  }

  @Get() @RequirePermissions('terrains:consulter') findAll(
    @Query() query: QueryTerrainDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.terrains.findAll(query, user);
  }

  @Get('catalogue') @RequirePermissions('crm:consulter') getCatalogue(
    @Query('search') search?: string,
  ) {
    return this.terrains.catalogueProposition(search);
  }

  @Get('options') @RequirePermissions('terrains:consulter') getOptions() {
    return this.terrains.getOptions();
  }

  @Get('stats') @RequirePermissions('terrains:consulter') getStats(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.terrains.getStats(user);
  }

  /**
   * Historique d'une fiche (journal d'audit filtré sur ce terrain). Accessible
   * à quiconque peut consulter le terrain : voir qui a changé un prix ou un
   * statut fait partie de la lecture normale d'une fiche.
   */
  @Get(':id/history')
  @RequirePermissions('terrains:consulter')
  async getHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.terrains.findOne(id, user);
    return this.audit.findAll(
      { entityType: 'Terrain', entityId: id },
      { page: 1, pageSize: 100 },
    );
  }

  @Get(':id') @RequirePermissions('terrains:consulter') findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.terrains.findOne(id, user);
  }

  @Post() @RequirePermissions('terrains:creer') async create(
    @Body() dto: CreateTerrainDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const terrain = await this.terrains.create(dto, user);
    // Même raison qu'à la modification : la trace enregistre la fiche
    // complète, pas la vue filtrée de son auteur.
    await this.audit.record({
      userId: user.id,
      action: 'terrain.created',
      entityType: 'Terrain',
      entityId: terrain.id,
      newValue: await this.terrains.findOne(terrain.id),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return terrain;
  }

  @Patch(':id') @RequirePermissions('terrains:modifier') async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTerrainDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    // Le journal est relu sans utilisateur, donc sans masquage financier.
    // Enregistré depuis la vue d'un commercial, il notait « marge : null →
    // null » pendant que la base passait de 0 à 25 millions : la trace était
    // aveugle précisément sur les champs qu'elle existe pour protéger
    // (section 8 du cahier des charges). Le client, lui, continue de recevoir
    // la fiche filtrée selon ses droits.
    const avant = await this.terrains.findOne(id);
    const terrain = await this.terrains.update(id, dto, user);
    const apres = await this.terrains.findOne(id);
    await this.audit.record({
      userId: user.id,
      action: 'terrain.updated',
      entityType: 'Terrain',
      entityId: id,
      oldValue: avant,
      newValue: apres,
      justification: dto.justification,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return terrain;
  }

  /**
   * Import d'un tableur (.xlsx ou .csv) : l'aperçu contrôle le fichier sans
   * rien écrire, l'import relit le même fichier et crée les biens.
   */
  @Post('import/preview')
  @RequirePermissions('terrains:creer')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_TAILLE_IMPORT } }),
  )
  apercuImport(
    @Body() dto: ImportTerrainsDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.importation.apercu(file, dto, user);
  }

  @Post('import')
  @RequirePermissions('terrains:creer')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_TAILLE_IMPORT } }),
  )
  async importer(
    @Body() dto: ImportTerrainsDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const resultat = await this.importation.importer(file, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'terrain.imported',
      entityType: 'Terrain',
      newValue: {
        fichier: file?.originalname,
        feuille: resultat.feuille,
        crees: resultat.crees,
        refuses: resultat.refuses,
        archives: dto.archives ?? false,
        publies: dto.publierDisponibles ?? false,
      },
      justification: 'Import d’un tableur de biens',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return resultat;
  }

  /**
   * Archivage : le bien quitte le portefeuille actif et le site public, sans
   * rien perdre. Réversible (`restore`), tracé avec son motif.
   */
  @Patch(':id/archive')
  @RequirePermissions('terrains:modifier')
  async archive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ArchiveTerrainDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const terrain = await this.terrains.archive(id, dto.motif, user);
    await this.audit.record({
      userId: user.id,
      action: 'terrain.archived',
      entityType: 'Terrain',
      entityId: id,
      oldValue: { archive: false },
      newValue: { archive: true },
      justification: dto.motif,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return terrain;
  }

  @Patch(':id/restore')
  @RequirePermissions('terrains:modifier')
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const terrain = await this.terrains.restore(id, user);
    await this.audit.record({
      userId: user.id,
      action: 'terrain.restored',
      entityType: 'Terrain',
      entityId: id,
      oldValue: { archive: true },
      newValue: { archive: false },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return terrain;
  }

  /** Notes de suivi chronologiques d'un bien (appels, visites, relances). */
  @Get(':id/notes')
  @RequirePermissions('terrains:consulter')
  async listNotes(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.terrains.findOne(id, user);
    return this.terrains.listNotes(id);
  }

  @Post(':id/notes')
  @RequirePermissions('terrains:modifier')
  addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTerrainNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.terrains.addNote(id, dto, user);
  }

  /** Affiche ou retire un bien vendu du site public (badge « Vendu »). */
  @Patch(':id/reference-vendue')
  @RequirePermissions('terrains:modifier')
  async setReferenceVendue(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReferenceVendueDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const terrain = await this.terrains.setReferenceVendue(
      id,
      dto.afficher,
      user,
    );
    await this.audit.record({
      userId: user.id,
      action: dto.afficher
        ? 'terrain.reference_vendue.affichee'
        : 'terrain.reference_vendue.retiree',
      entityType: 'Terrain',
      entityId: id,
      newValue: { referenceVendue: dto.afficher },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return terrain;
  }

  @Patch(':id/juridical-status')
  @RequirePermissions('terrains:valider')
  updateJuridical(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTerrainStatusDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.updateStatus(
      id,
      'statutJuridique',
      dto.value,
      dto.justification,
      user,
      req,
    );
  }
  @Patch(':id/verification-status')
  @RequirePermissions('terrains:valider')
  updateVerification(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTerrainStatusDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.updateStatus(
      id,
      'niveauVerification',
      dto.value,
      dto.justification,
      user,
      req,
    );
  }
  @Patch(':id/commercial-status')
  @RequirePermissions('terrains:modifier')
  updateCommercial(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTerrainStatusDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.updateStatus(
      id,
      'statutCommercial',
      dto.value,
      dto.justification,
      user,
      req,
    );
  }

  private async updateStatus(
    id: string,
    field: 'statutJuridique' | 'niveauVerification' | 'statutCommercial',
    value: string,
    justification: string | undefined,
    user: AuthenticatedUser,
    req: Request,
  ) {
    const before = await this.terrains.findOne(id);
    const terrain = await this.terrains.updateStatus(
      id,
      field,
      value,
      justification,
      user,
    );
    await this.audit.record({
      userId: user.id,
      action: `terrain.${field}.updated`,
      entityType: 'Terrain',
      entityId: id,
      oldValue: { [field]: before[field] },
      newValue: { [field]: value },
      justification,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return terrain;
  }

  @Post(':id/media')
  @RequirePermissions('terrains:modifier')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_ASSET_SIZE } }),
  )
  async addMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTerrainAssetDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file)
      throw new BadRequestException('Un fichier média est obligatoire');
    const media = await this.assets.addMedia(id, dto, file, user);
    await this.audit.record({
      userId: user.id,
      action: 'terrain.media.created',
      entityType: 'TerrainMedia',
      entityId: media.id,
      newValue: { terrainId: id, type: dto.type },
    });
    return media;
  }

  @Post(':id/documents')
  @RequirePermissions('terrains:modifier')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_ASSET_SIZE } }),
  )
  async addDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTerrainAssetDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Un document est obligatoire');
    const document = await this.assets.addDocument(id, dto, file, user);
    await this.audit.record({
      userId: user.id,
      action: 'terrain.document.created',
      entityType: 'TerrainDocument',
      entityId: document.id,
      newValue: { terrainId: id, type: dto.type },
    });
    return document;
  }

  @Delete(':id/media/:mediaId')
  @RequirePermissions('terrains:modifier')
  async removeMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.assets.removeMedia(id, mediaId, user);
    await this.audit.record({
      userId: user.id,
      action: 'terrain.media.deleted',
      entityType: 'TerrainMedia',
      entityId: mediaId,
    });
    return { success: true };
  }

  @Delete(':id/documents/:documentId')
  @RequirePermissions('terrains:modifier')
  async removeDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.assets.removeDocument(id, documentId, user);
    await this.audit.record({
      userId: user.id,
      action: 'terrain.document.deleted',
      entityType: 'TerrainDocument',
      entityId: documentId,
    });
    return { success: true };
  }
}
