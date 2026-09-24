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
import { BauxService } from './baux.service';
import { PaiementsLoyerService } from './paiements.service';
import { CautionService } from './caution.service';
import { IncidentsLocatifService } from './incidents.service';
import { DocumentsLocatifService } from './documents.service';
import { RelancesLoyerService } from './relances.service';
import {
  PreavisBailDto,
  ResiliationSansPreavisDto,
  SortieBailDto,
  UpdateBailDto,
} from './dto/bail.dto';
import { CreatePaiementLoyerDto, RejetPaiementDto } from './dto/paiement.dto';
import { CreateMouvementCautionDto } from './dto/caution.dto';
import { CreateIncidentDto, UpdateIncidentDto } from './dto/incident.dto';
import {
  CreateDocumentLocatifDto,
  VisibiliteDocumentDto,
} from './dto/document.dto';

/** Un bail précis et tout ce qui s'y rattache (J2.1, section 15 du CDC). */
@ApiTags('locatif')
@Controller('locatif/baux')
export class BauxController {
  constructor(
    private readonly baux: BauxService,
    private readonly paiements: PaiementsLoyerService,
    private readonly caution: CautionService,
    private readonly incidents: IncidentsLocatifService,
    private readonly documents: DocumentsLocatifService,
    private readonly relances: RelancesLoyerService,
    private readonly audit: AuditService,
  ) {}

  @Get(':id')
  @RequirePermissions('locatif:consulter')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.baux.findOne(id, user);
  }

  @Patch(':id')
  @RequirePermissions('locatif:modifier')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBailDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const bail = await this.baux.update(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'bail.updated',
      entityType: 'BailLocatif',
      entityId: id,
      newValue: dto,
    });
    return bail;
  }

  @Patch(':id/preavis')
  @RequirePermissions('locatif:modifier')
  async donnerPreavis(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PreavisBailDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const bail = await this.baux.donnerPreavis(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'bail.preavis',
      entityType: 'BailLocatif',
      entityId: id,
      newValue: dto,
    });
    return bail;
  }

  /**
   * Calcul de régularisation de sortie (section 15) : ce que l'écran de
   * clôture propose avant confirmation. N'écrit rien.
   */
  @Get(':id/regularisation')
  @RequirePermissions('locatif:consulter')
  previsualiserRegularisation(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('dateSortie') dateSortie: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.baux.previsualiserRegularisation(id, dateSortie, user);
  }

  @Post(':id/sortie')
  @RequirePermissions('locatif:modifier')
  async cloturer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SortieBailDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const bail = await this.baux.cloturer(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'bail.cloture',
      entityType: 'BailLocatif',
      entityId: id,
      newValue: {
        ...dto,
        regularisationRetenue: bail.regularisationMontant,
        cautionStatut: bail.cautionStatut,
      },
      justification: dto.cautionJustification,
    });
    return bail;
  }

  @Post(':id/resiliation-sans-preavis')
  @RequirePermissions('locatif:modifier')
  async resilierSansPreavis(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResiliationSansPreavisDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const bail = await this.baux.resilierSansPreavis(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'bail.resiliation_sans_preavis',
      entityType: 'BailLocatif',
      entityId: id,
      justification: dto.motifCloture,
    });
    return bail;
  }

  // --- Échéances, paiements et solde ---

  @Get(':id/echeances')
  @RequirePermissions('locatif:consulter')
  getEcheances(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paiements.getEcheances(id, user);
  }

  @Get(':id/solde')
  @RequirePermissions('locatif:consulter')
  getSolde(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paiements.getSolde(id, user);
  }

  @Get(':id/paiements')
  @RequirePermissions('locatif:consulter')
  findPaiements(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paiements.findAll(id, user);
  }

  @Post(':id/paiements')
  @RequirePermissions('locatif:modifier')
  async createPaiement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePaiementLoyerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const paiement = await this.paiements.create(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'bail.paiement.created',
      entityType: 'PaiementLoyer',
      entityId: paiement.id,
      newValue: { bailLocatifId: id, ...dto },
    });
    return paiement;
  }

  /**
   * Contrôle des encaissements (section 24 : permission « valider ») : c'est
   * la validation qui impute le versement sur les échéances.
   */
  @Post(':id/paiements/:paiementId/valider')
  @RequirePermissions('locatif:valider')
  async validerPaiement(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('paiementId', ParseUUIDPipe) paiementId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const paiement = await this.paiements.valider(id, paiementId, user);
    await this.audit.record({
      userId: user.id,
      action: 'bail.paiement.validated',
      entityType: 'PaiementLoyer',
      entityId: paiementId,
      newValue: { bailLocatifId: id, montant: paiement.montant },
    });
    return paiement;
  }

  @Post(':id/paiements/:paiementId/rejeter')
  @RequirePermissions('locatif:valider')
  async rejeterPaiement(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('paiementId', ParseUUIDPipe) paiementId: string,
    @Body() dto: RejetPaiementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const paiement = await this.paiements.rejeter(id, paiementId, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'bail.paiement.rejected',
      entityType: 'PaiementLoyer',
      entityId: paiementId,
      oldValue: { bailLocatifId: id, montant: paiement.montant },
      justification: dto.motif,
    });
    return paiement;
  }

  @Post(':id/echeances/:echeanceId/quittance')
  @RequirePermissions('locatif:valider')
  async genererQuittance(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('echeanceId', ParseUUIDPipe) echeanceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const document = await this.documents.genererQuittance(
      id,
      echeanceId,
      user,
    );
    await this.audit.record({
      userId: user.id,
      action: 'bail.quittance.generee',
      entityType: 'DocumentLocatif',
      entityId: document.id,
      newValue: { bailLocatifId: id, echeanceId },
    });
    return document;
  }

  // --- Caution (section 15 : historique complet) ---

  @Get(':id/caution')
  @RequirePermissions('locatif:consulter')
  getCaution(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.caution.findAll(id, user);
  }

  @Post(':id/caution')
  @RequirePermissions('locatif:modifier')
  async enregistrerMouvementCaution(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMouvementCautionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const resultat = await this.caution.enregistrer(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: `bail.caution.${dto.type}`,
      entityType: 'BailLocatif',
      entityId: id,
      newValue: { ...dto, statutCaution: resultat.etat.statut },
      justification: dto.justification,
    });
    return resultat;
  }

  // --- Incidents et demandes ---

  @Get(':id/incidents')
  @RequirePermissions('locatif:consulter')
  findIncidents(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('nature') nature: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.incidents.findAll(id, user, nature);
  }

  @Post(':id/incidents')
  @RequirePermissions('locatif:modifier')
  async createIncident(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateIncidentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const incident = await this.incidents.create(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'bail.incident.created',
      entityType: 'IncidentLocatif',
      entityId: incident.id,
      newValue: { bailLocatifId: id, nature: incident.nature, type: dto.type },
    });
    return incident;
  }

  @Patch(':id/incidents/:incidentId')
  @RequirePermissions('locatif:modifier')
  async updateIncident(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('incidentId', ParseUUIDPipe) incidentId: string,
    @Body() dto: UpdateIncidentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const incident = await this.incidents.update(id, incidentId, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'bail.incident.updated',
      entityType: 'IncidentLocatif',
      entityId: incidentId,
      newValue: dto,
    });
    return incident;
  }

  // --- Relances (section 15) ---

  @Get(':id/relances')
  @RequirePermissions('locatif:consulter')
  findRelances(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.relances.findForBail(id, user);
  }

  // --- Documents ---

  @Get(':id/documents')
  @RequirePermissions('locatif:consulter')
  findDocuments(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.findAll(id, user);
  }

  @Post(':id/documents')
  @RequirePermissions('locatif:modifier')
  @UseInterceptors(FileInterceptor('file'))
  async addDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDocumentLocatifDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const document = await this.documents.addDocument(id, dto, file, user);
    await this.audit.record({
      userId: user.id,
      action: 'bail.document.uploaded',
      entityType: 'DocumentLocatif',
      entityId: document.id,
      newValue: { bailLocatifId: id, type: dto.type, title: dto.title },
    });
    return document;
  }

  @Patch(':id/documents/:documentId/visibilite')
  @RequirePermissions('locatif:publier')
  async setDocumentVisibility(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: VisibiliteDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const document = await this.documents.setVisibility(
      id,
      documentId,
      dto,
      user,
    );
    await this.audit.record({
      userId: user.id,
      action: 'bail.document.visibilite',
      entityType: 'DocumentLocatif',
      entityId: documentId,
      newValue: {
        bailLocatifId: id,
        visibleLocataire: document.visibleLocataire,
        visibleProprietaire: document.visibleProprietaire,
      },
    });
    return document;
  }

  @Delete(':id/documents/:documentId')
  @RequirePermissions('locatif:modifier')
  async removeDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.documents.removeDocument(id, documentId, user);
    await this.audit.record({
      userId: user.id,
      action: 'bail.document.deleted',
      entityType: 'DocumentLocatif',
      entityId: documentId,
      oldValue: { bailLocatifId: id },
    });
    return { success: true };
  }
}
