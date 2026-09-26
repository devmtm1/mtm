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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { ProjetsConstructionService } from './projets.service';
import { ConstructionOptionsService } from './construction-options.service';
import { JalonsChantierService } from './jalons.service';
import { JournalChantierService } from './journal.service';
import { BudgetChantierService } from './budget.service';
import { DocumentsChantierService } from './documents.service';
import { ConstructionClientService } from './construction-client.service';
import {
  CreateProjetDto,
  QueryProjetDto,
  TransitionProjetDto,
  UpdateProjetDto,
} from './dto/projet.dto';
import {
  CreateDepenseDto,
  CreateEntreeJournalDto,
  CreateIntervenantDto,
  CreateJalonDto,
  CreateLigneBudgetDto,
  QueryJournalDto,
  ReordonnerJalonsDto,
  UpdateEntreeJournalDto,
  UpdateIntervenantDto,
  UpdateJalonDto,
  UpdateLigneBudgetDto,
  ValiderDepenseDto,
} from './dto/chantier-suivi.dto';

/**
 * Construction et suivi de chantier (J2.3, section 16 du cahier des charges).
 *
 * Les routes littérales (`options`, `stats`, `client`) sont déclarées avant
 * celles à paramètre, sans quoi « options » serait lu comme un identifiant.
 */
@ApiTags('construction')
@Controller('construction/chantiers')
export class ConstructionController {
  constructor(
    private readonly projets: ProjetsConstructionService,
    private readonly options: ConstructionOptionsService,
    private readonly jalons: JalonsChantierService,
    private readonly journal: JournalChantierService,
    private readonly budget: BudgetChantierService,
    private readonly documents: DocumentsChantierService,
    private readonly client: ConstructionClientService,
    private readonly audit: AuditService,
  ) {}

  // ----------------------------------------------------------------
  // Espace client — déclaré en premier, sinon « client » serait pris
  // pour un identifiant de chantier.
  // ----------------------------------------------------------------

  @Get('client/chantiers')
  getClientChantiers(@CurrentUser() user: AuthenticatedUser) {
    return this.client.getChantiers(user.id);
  }

  @Get('client/chantiers/:id')
  getClientChantier(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.client.getChantier(user.id, id);
  }

  @Get('client/documents/:documentId')
  getClientDocument(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.client.getDocument(user.id, documentId);
  }

  // ----------------------------------------------------------------
  // Chantiers
  // ----------------------------------------------------------------

  @Get()
  @RequirePermissions('construction:consulter')
  findAll(
    @Query() query: QueryProjetDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projets.findAll(query, user);
  }

  @Get('options')
  @RequirePermissions('construction:consulter')
  getOptions() {
    return this.options.getOptions();
  }

  @Get('stats')
  @RequirePermissions('construction:consulter')
  getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.projets.stats(user);
  }

  @Get(':id')
  @RequirePermissions('construction:consulter')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projets.findOne(id, user);
  }

  @Post()
  @RequirePermissions('construction:creer')
  async create(
    @Body() dto: CreateProjetDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const projet = await this.projets.create(dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'chantier.cree',
      entityType: 'ProjetConstruction',
      entityId: projet.id,
      newValue: {
        reference: projet.referenceInterne,
        intitule: projet.intitule,
      },
    });
    return projet;
  }

  @Patch(':id')
  @RequirePermissions('construction:modifier')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjetDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const projet = await this.projets.update(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'chantier.modifie',
      entityType: 'ProjetConstruction',
      entityId: id,
      newValue: dto,
    });
    return projet;
  }

  @Post(':id/transition')
  @RequirePermissions('construction:modifier')
  async transition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionProjetDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const projet = await this.projets.transition(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: `chantier.${dto.statut}`,
      entityType: 'ProjetConstruction',
      entityId: id,
      newValue: dto,
    });
    return projet;
  }

  @Delete(':id')
  @RequirePermissions('construction:supprimer')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.projets.remove(id, user);
    await this.audit.record({
      userId: user.id,
      action: 'chantier.supprime',
      entityType: 'ProjetConstruction',
      entityId: id,
    });
    return { success: true };
  }

  // ----------------------------------------------------------------
  // Planning
  // ----------------------------------------------------------------

  @Get(':id/jalons')
  @RequirePermissions('construction:consulter')
  getJalons(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.jalons.findAll(id, user);
  }

  @Post(':id/jalons')
  @RequirePermissions('construction:modifier')
  createJalon(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateJalonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.jalons.create(id, dto, user);
  }

  @Patch(':id/jalons/reordonner')
  @RequirePermissions('construction:modifier')
  reordonnerJalons(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReordonnerJalonsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.jalons.reordonner(id, dto, user);
  }

  @Patch(':id/jalons/:jalonId')
  @RequirePermissions('construction:modifier')
  updateJalon(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('jalonId', ParseUUIDPipe) jalonId: string,
    @Body() dto: UpdateJalonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.jalons.update(id, jalonId, dto, user);
  }

  @Delete(':id/jalons/:jalonId')
  @RequirePermissions('construction:modifier')
  async removeJalon(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('jalonId', ParseUUIDPipe) jalonId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.jalons.remove(id, jalonId, user);
    return { success: true };
  }

  // ----------------------------------------------------------------
  // Journal de chantier
  // ----------------------------------------------------------------

  @Get(':id/journal')
  @RequirePermissions('construction:consulter')
  getJournal(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryJournalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.journal.findAll(id, query, user);
  }

  @Post(':id/journal')
  @RequirePermissions('construction:modifier')
  async createEntree(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateEntreeJournalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const entree = await this.journal.create(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'chantier.journal_ajoute',
      entityType: 'EntreeJournalChantier',
      entityId: entree.id,
      newValue: { projetId: id, date: dto.date },
    });
    return entree;
  }

  @Patch(':id/journal/:entreeId')
  @RequirePermissions('construction:modifier')
  updateEntree(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entreeId', ParseUUIDPipe) entreeId: string,
    @Body() dto: UpdateEntreeJournalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.journal.update(id, entreeId, dto, user);
  }

  @Delete(':id/journal/:entreeId')
  @RequirePermissions('construction:modifier')
  async removeEntree(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entreeId', ParseUUIDPipe) entreeId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.journal.remove(id, entreeId, user);
    return { success: true };
  }

  // ----------------------------------------------------------------
  // Prestataires
  // ----------------------------------------------------------------

  @Get(':id/intervenants')
  @RequirePermissions('construction:consulter')
  getIntervenants(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.budget.listerIntervenants(id, user);
  }

  @Post(':id/intervenants')
  @RequirePermissions('construction:modifier')
  createIntervenant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateIntervenantDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.budget.ajouterIntervenant(id, dto, user);
  }

  @Patch(':id/intervenants/:intervenantId')
  @RequirePermissions('construction:modifier')
  updateIntervenant(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('intervenantId', ParseUUIDPipe) intervenantId: string,
    @Body() dto: UpdateIntervenantDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.budget.modifierIntervenant(id, intervenantId, dto, user);
  }

  @Delete(':id/intervenants/:intervenantId')
  @RequirePermissions('construction:modifier')
  async removeIntervenant(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('intervenantId', ParseUUIDPipe) intervenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.budget.retirerIntervenant(id, intervenantId, user);
    return { success: true };
  }

  // ----------------------------------------------------------------
  // Budget prévisionnel et dépenses
  // ----------------------------------------------------------------

  @Get(':id/budget')
  @RequirePermissions('construction:consulter')
  getBudget(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.budget.synthese(id, user);
  }

  @Get(':id/budget/lignes')
  @RequirePermissions('construction:consulter')
  getLignes(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.budget.listerLignes(id, user);
  }

  @Post(':id/budget/lignes')
  @RequirePermissions('construction:modifier')
  createLigne(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateLigneBudgetDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.budget.ajouterLigne(id, dto, user);
  }

  @Patch(':id/budget/lignes/:ligneId')
  @RequirePermissions('construction:modifier')
  updateLigne(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('ligneId', ParseUUIDPipe) ligneId: string,
    @Body() dto: UpdateLigneBudgetDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.budget.modifierLigne(id, ligneId, dto, user);
  }

  @Delete(':id/budget/lignes/:ligneId')
  @RequirePermissions('construction:modifier')
  async removeLigne(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('ligneId', ParseUUIDPipe) ligneId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.budget.retirerLigne(id, ligneId, user);
    return { success: true };
  }

  @Get(':id/depenses')
  @RequirePermissions('construction:consulter')
  getDepenses(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.budget.listerDepenses(id, user);
  }

  @Post(':id/depenses')
  @RequirePermissions('construction:modifier')
  async createDepense(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDepenseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const depense = await this.budget.ajouterDepense(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'chantier.depense_saisie',
      entityType: 'DepenseChantier',
      entityId: depense.id,
      newValue: { projetId: id, montant: dto.montant, poste: dto.poste },
    });
    return depense;
  }

  /** Contrôle comptable : distinct de la saisie (section 24). */
  @Post(':id/depenses/:depenseId/valider')
  @RequirePermissions('construction:payer')
  async validerDepense(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('depenseId', ParseUUIDPipe) depenseId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const depense = await this.budget.validerDepense(id, depenseId, user);
    await this.audit.record({
      userId: user.id,
      action: 'chantier.depense_validee',
      entityType: 'DepenseChantier',
      entityId: depenseId,
      newValue: { montant: Number(depense.montant) },
    });
    return depense;
  }

  @Post(':id/depenses/:depenseId/rejeter')
  @RequirePermissions('construction:payer')
  async rejeterDepense(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('depenseId', ParseUUIDPipe) depenseId: string,
    @Body() dto: ValiderDepenseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const depense = await this.budget.rejeterDepense(id, depenseId, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'chantier.depense_rejetee',
      entityType: 'DepenseChantier',
      entityId: depenseId,
      newValue: { motif: dto.motif },
    });
    return depense;
  }

  @Delete(':id/depenses/:depenseId')
  @RequirePermissions('construction:modifier')
  async removeDepense(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('depenseId', ParseUUIDPipe) depenseId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.budget.retirerDepense(id, depenseId, user);
    return { success: true };
  }

  // ----------------------------------------------------------------
  // Pièces et rapport
  // ----------------------------------------------------------------

  @Get(':id/documents')
  @RequirePermissions('construction:consulter')
  getDocuments(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.findAll(id, user);
  }

  @Post(':id/documents')
  @RequirePermissions('construction:modifier')
  @UseInterceptors(FileInterceptor('file'))
  createDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { type: string; title?: string; entreeJournalId?: string },
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.addDocument(id, dto, file, user);
  }

  /** Rapport d'avancement remis au client : publié d'office. */
  @Post(':id/rapport')
  @RequirePermissions('construction:modifier')
  async genererRapport(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const document = await this.documents.genererRapport(id, user);
    await this.audit.record({
      userId: user.id,
      action: 'chantier.rapport_genere',
      entityType: 'DocumentChantier',
      entityId: document.id,
      newValue: { projetId: id, version: document.version },
    });
    return document;
  }

  /** Publication d'une pièce vers l'espace client (section 16). */
  @Patch(':id/documents/:documentId/visibilite')
  @RequirePermissions('construction:publier')
  async setVisibilite(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body('visibleClient') visibleClient: boolean,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const document = await this.documents.setVisibility(
      id,
      documentId,
      visibleClient === true,
      user,
    );
    await this.audit.record({
      userId: user.id,
      action: visibleClient
        ? 'chantier.piece_publiee'
        : 'chantier.piece_retiree',
      entityType: 'DocumentChantier',
      entityId: documentId,
    });
    return document;
  }

  @Delete(':id/documents/:documentId')
  @RequirePermissions('construction:modifier')
  async removeDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.documents.removeDocument(id, documentId, user);
    return { success: true };
  }
}
