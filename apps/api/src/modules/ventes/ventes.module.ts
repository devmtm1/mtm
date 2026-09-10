import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { VentesController } from './ventes.controller';
import { VentesService } from './ventes.service';

@Module({
  imports: [AuditModule],
  controllers: [VentesController],
  providers: [VentesService, CloudinaryService],
  exports: [VentesService],
})
export class VentesModule {}
