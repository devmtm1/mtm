import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { SettingsModule } from '../settings/settings.module';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { DemarchesController } from './demarches.controller';
import { DemarchesService } from './demarches.service';
import { DemarchesAccessService } from './demarches-access.service';
import { DemarchesOptionsService } from './demarches-options.service';
import { DemarchesEtapesService } from './demarches-etapes.service';
import { DemarchesDocumentsService } from './demarches-documents.service';
import { DemarchesClientService } from './demarches-client.service';

/** Démarches administratives et vérification foncière (J2.2, section 14 CDC). */
@Module({
  imports: [AuditModule, SettingsModule],
  controllers: [DemarchesController],
  providers: [
    DemarchesAccessService,
    DemarchesOptionsService,
    DemarchesService,
    DemarchesEtapesService,
    DemarchesDocumentsService,
    DemarchesClientService,
    CloudinaryService,
  ],
  exports: [DemarchesService],
})
export class DemarchesModule {}
