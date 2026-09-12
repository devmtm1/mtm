import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { SettingsModule } from '../settings/settings.module';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { VentesController } from './ventes.controller';
import { VentesService } from './ventes.service';
import { ObjectifsController } from './objectifs.controller';
import { ObjectifsService } from './objectifs.service';
import { VentesWorkflowService } from './ventes-workflow.service';
import { VentesPaiementsService } from './ventes-paiements.service';
import { VentesCommissionsService } from './ventes-commissions.service';
import { VentesAccessService } from './ventes-access.service';
import { VentesDocumentsService } from './ventes-documents.service';
import { ClientPortalService } from './client-portal.service';
import { VentesReportingService } from './ventes-reporting.service';

@Module({
  imports: [AuditModule, SettingsModule],
  // ObjectifsController en premier : ses routes fixes (/ventes/objectifs)
  // doivent être enregistrées avant /ventes/:id.
  controllers: [ObjectifsController, VentesController],
  providers: [
    VentesAccessService,
    VentesWorkflowService,
    VentesService,
    VentesPaiementsService,
    VentesCommissionsService,
    VentesDocumentsService,
    ClientPortalService,
    VentesReportingService,
    ObjectifsService,
    CloudinaryService,
  ],
  exports: [VentesService],
})
export class VentesModule {}
