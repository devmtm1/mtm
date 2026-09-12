import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { MandatsController } from './mandats.controller';
import { MandatsService } from './mandats.service';
import { MandatsAccessService } from './mandats-access.service';
import { MandatsFinanceService } from './mandats-finance.service';
import { MandatsAlertesService } from './mandats-alertes.service';
import { MandatsLotsService } from './mandats-lots.service';
import { MandatsDocumentsService } from './mandats-documents.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [AuditModule, SettingsModule],
  controllers: [MandatsController],
  providers: [
    MandatsAccessService,
    MandatsFinanceService,
    MandatsAlertesService,
    MandatsLotsService,
    MandatsDocumentsService,
    MandatsService,
    CloudinaryService,
  ],
  exports: [MandatsService],
})
export class MandatsModule {}
