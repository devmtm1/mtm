import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { CrmAccessService } from './crm-access.service';
import { CrmOptionsService } from './crm-options.service';
import { CrmActivitesService } from './crm-activites.service';
import { CrmDocumentsService } from './crm-documents.service';
import { CrmReportingService } from './crm-reporting.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [AuditModule, SettingsModule],
  controllers: [CrmController],
  providers: [
    CrmAccessService,
    CrmOptionsService,
    CrmService,
    CrmActivitesService,
    CrmDocumentsService,
    CrmReportingService,
    CloudinaryService,
  ],
  exports: [CrmService],
})
export class CrmModule {}
