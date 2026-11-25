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
  AffecterMaterielDto,
  AjouterNumeroInventaireDto,
  CreateEntretienDto,
  CreateInventaireDto,
  CreateMaterielDto,
  DeposerFichierMaterielDto,
  ListerMaterielDto,
  RetourMaterielDto,
  SortieMaterielDto,
  TerminerEntretienDto,
  TerminerInventaireDto,
  UpdateMaterielDto,
} from './dto/materiel.dto';
import { MaterielService } from './materiel.service';

@ApiTags('materiel')
@Controller('materiel')
export class MaterielController {
  constructor(private readonly materiel: MaterielService) {}

  @Get('options')
  @RequirePermissions('materiel:consulter')
  options() {
    return this.materiel.options();
  }

  /** Les personnes et chantiers à qui l'on peut confier un objet (le secrétariat n'a pas forcément accès aux listes d'origine). */
  @Get('destinataires')
  @RequirePermissions('materiel:modifier')
  destinataires(@Query('q') q?: string) {
    return this.materiel.destinataires(q);
  }

  @Get('tableau')
  @RequirePermissions('materiel:consulter')
  tableau(@CurrentUser() user: AuthenticatedUser) {
    return this.materiel.tableau(user);
  }

  // --- Inventaire physique (avant « :id » pour que « inventaires » ne soit pas pris pour un identifiant) ---

  @Get('inventaires')
  @RequirePermissions('materiel:consulter')
  listerInventaires() {
    return this.materiel.listerInventaires();
  }

  @Post('inventaires')
  @RequirePermissions('materiel:modifier')
  creerInventaire(
    @Body() dto: CreateInventaireDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.materiel.creerInventaire(dto.lieu, user);
  }

  @Get('inventaires/:id')
  @RequirePermissions('materiel:consulter')
  rapportInventaire(@Param('id', ParseUUIDPipe) id: string) {
    return this.materiel.rapportInventaire(id);
  }

  @Post('inventaires/:id/numeros')
  @RequirePermissions('materiel:modifier')
  ajouterNumero(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AjouterNumeroInventaireDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.materiel.ajouterNumeroInventaire(id, dto.numero, user);
  }

  @Post('inventaires/:id/terminer')
  @RequirePermissions('materiel:modifier')
  terminerInventaire(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TerminerInventaireDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.materiel.terminerInventaire(
      id,
      dto.mettreAJourLieux === true,
      user,
    );
  }

  // --- Fiches ---

  @Get()
  @RequirePermissions('materiel:consulter')
  lister(
    @Query() query: ListerMaterielDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.materiel.lister(query, user);
  }

  @Post()
  @RequirePermissions('materiel:creer')
  creer(
    @Body() dto: CreateMaterielDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.materiel.creer(dto, user);
  }

  @Get(':id')
  @RequirePermissions('materiel:consulter')
  detail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.materiel.detail(id, user);
  }

  @Patch(':id')
  @RequirePermissions('materiel:modifier')
  modifier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaterielDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.materiel.modifier(id, dto, user);
  }

  @Post(':id/affecter')
  @RequirePermissions('materiel:modifier')
  affecter(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AffecterMaterielDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.materiel.affecter(id, dto, user);
  }

  @Post(':id/retour')
  @RequirePermissions('materiel:modifier')
  retourner(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RetourMaterielDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.materiel.retourner(id, dto, user);
  }

  /** Sortie du parc : réservée à qui valide (la Direction), avec un motif. */
  @Post(':id/sortie')
  @RequirePermissions('materiel:valider')
  sortir(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SortieMaterielDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.materiel.sortir(id, dto, user);
  }

  @Post(':id/entretiens')
  @RequirePermissions('materiel:modifier')
  ajouterEntretien(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateEntretienDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.materiel.ajouterEntretien(id, dto, user);
  }

  @Post(':id/entretiens/:entretienId/terminer')
  @RequirePermissions('materiel:modifier')
  terminerEntretien(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entretienId', ParseUUIDPipe) entretienId: string,
    @Body() dto: TerminerEntretienDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.materiel.terminerEntretien(id, entretienId, dto, user);
  }

  @Post(':id/fichiers')
  @RequirePermissions('materiel:modifier')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_ASSET_SIZE } }),
  )
  deposerFichier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeposerFichierMaterielDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Un fichier est obligatoire');
    return this.materiel.deposerFichier(id, dto, file, user);
  }
}
