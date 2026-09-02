import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { MandatsController } from './mandats.controller';
import { MandatsService } from './mandats.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [AuditModule, SettingsModule],
  controllers: [MandatsController],
  providers: [MandatsService, CloudinaryService],
  exports: [MandatsService],
})
export class MandatsModule {}
