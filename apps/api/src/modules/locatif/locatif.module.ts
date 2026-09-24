import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { SettingsModule } from '../settings/settings.module';
import { ClientAccountsModule } from '../client-accounts/client-accounts.module';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { BiensController } from './biens.controller';
import { BauxController } from './baux.controller';
import { LocatairesController } from './locataires.controller';
import { RelancesController } from './relances.controller';
import { LocatifPortailController } from './locatif-portail.controller';
import { LocatifAccessService } from './locatif-access.service';
import { LocatifOptionsService } from './locatif-options.service';
import { LocatairesService } from './locataires.service';
import { BiensService } from './biens.service';
import { BauxService } from './baux.service';
import { PaiementsLoyerService } from './paiements.service';
import { CautionService } from './caution.service';
import { IncidentsLocatifService } from './incidents.service';
import { DocumentsLocatifService } from './documents.service';
import { RelancesLoyerService } from './relances.service';
import { LocatifSchedulerService } from './locatif-scheduler.service';
import { ProprietairePortalService } from './proprietaire-portal.service';
import { LocatairePortalService } from './locataire-portal.service';

/** Gestion locative (J2.1, section 15 du cahier des charges). */
@Module({
  imports: [AuditModule, SettingsModule, ClientAccountsModule],
  controllers: [
    BiensController,
    BauxController,
    LocatairesController,
    RelancesController,
    LocatifPortailController,
  ],
  providers: [
    LocatifAccessService,
    LocatifOptionsService,
    LocatairesService,
    BiensService,
    BauxService,
    PaiementsLoyerService,
    CautionService,
    IncidentsLocatifService,
    DocumentsLocatifService,
    RelancesLoyerService,
    LocatifSchedulerService,
    ProprietairePortalService,
    LocatairePortalService,
    CloudinaryService,
  ],
  exports: [BiensService, BauxService],
})
export class LocatifModule {}
