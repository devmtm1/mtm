import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { TerrainsController } from './terrains.controller';
import { TerrainsService } from './terrains.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [AuditModule, SettingsModule],
  controllers: [TerrainsController],
  providers: [TerrainsService, CloudinaryService],
  exports: [TerrainsService],
})
export class TerrainsModule {}
