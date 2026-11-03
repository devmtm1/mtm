import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { TerrainsController } from './terrains.controller';
import { ProgrammesController } from './programmes.controller';
import { ProgrammesService } from './programmes.service';
import { ProgrammesPilotageService } from './programmes-pilotage.service';
import { ProgrammesPublicService } from './programmes-public.service';
import { ProgrammesAssetsService } from './programmes-assets.service';
import { TerrainsService } from './terrains.service';
import { TerrainsAccessService } from './terrains-access.service';
import { TerrainsPublicService } from './terrains-public.service';
import { TerrainsAssetsService } from './terrains-assets.service';
import { TerrainsImportService } from './import/terrains-import.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [AuditModule, SettingsModule],
  controllers: [TerrainsController, ProgrammesController],
  providers: [
    TerrainsAccessService,
    TerrainsPublicService,
    TerrainsAssetsService,
    TerrainsImportService,
    TerrainsService,
    ProgrammesService,
    ProgrammesPilotageService,
    ProgrammesPublicService,
    ProgrammesAssetsService,
    CloudinaryService,
  ],
  exports: [TerrainsService, TerrainsAccessService],
})
export class TerrainsModule {}
