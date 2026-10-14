import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DossiersModule } from '../dossiers/dossiers.module';
import { TachesController } from './taches.controller';
import { TachesSchedulerService } from './taches-scheduler.service';
import { TachesService } from './taches.service';

/** Tâches assignables (J2.4, section 21 du cahier des charges). */
@Module({
  imports: [AuditModule, DossiersModule],
  controllers: [TachesController],
  providers: [TachesService, TachesSchedulerService],
  exports: [TachesService],
})
export class TachesModule {}
