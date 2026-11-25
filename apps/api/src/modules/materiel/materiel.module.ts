import { Module } from '@nestjs/common';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { AuditModule } from '../audit/audit.module';
import { SettingsModule } from '../settings/settings.module';
import { MaterielController } from './materiel.controller';
import { MaterielRappelsService } from './materiel-rappels.service';
import { MaterielService } from './materiel.service';

@Module({
  imports: [AuditModule, SettingsModule],
  controllers: [MaterielController],
  providers: [MaterielService, MaterielRappelsService, CloudinaryService],
})
export class MaterielModule {}
