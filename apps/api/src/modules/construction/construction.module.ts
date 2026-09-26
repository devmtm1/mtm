import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { SettingsModule } from '../settings/settings.module';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { ConstructionController } from './construction.controller';
import { ConstructionAccessService } from './construction-access.service';
import { ConstructionOptionsService } from './construction-options.service';
import { ProjetsConstructionService } from './projets.service';
import { JalonsChantierService } from './jalons.service';
import { JournalChantierService } from './journal.service';
import { BudgetChantierService } from './budget.service';
import { DocumentsChantierService } from './documents.service';
import { ConstructionClientService } from './construction-client.service';
import { ConstructionSchedulerService } from './construction-scheduler.service';

/** Construction et suivi de chantier (J2.3, section 16 du cahier des charges). */
@Module({
  imports: [AuditModule, SettingsModule],
  controllers: [ConstructionController],
  providers: [
    ConstructionAccessService,
    ConstructionOptionsService,
    ProjetsConstructionService,
    JalonsChantierService,
    JournalChantierService,
    BudgetChantierService,
    DocumentsChantierService,
    ConstructionClientService,
    ConstructionSchedulerService,
    CloudinaryService,
  ],
  exports: [ProjetsConstructionService],
})
export class ConstructionModule {}
