import { Module } from '@nestjs/common';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { AuditModule } from '../audit/audit.module';
import { SettingsModule } from '../settings/settings.module';
import { VentesModule } from '../ventes/ventes.module';
import { ProtocolesController } from './protocoles.controller';
import { ProtocolesRappelsService } from './protocoles-rappels.service';
import { ProtocolesService } from './protocoles.service';

@Module({
  imports: [AuditModule, SettingsModule, VentesModule],
  controllers: [ProtocolesController],
  providers: [ProtocolesService, ProtocolesRappelsService, CloudinaryService],
})
export class ProtocolesModule {}
