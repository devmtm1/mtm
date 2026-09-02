import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [AuditModule, SettingsModule],
  controllers: [CrmController],
  providers: [CrmService, CloudinaryService],
  exports: [CrmService],
})
export class CrmModule {}
