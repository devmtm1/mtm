import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ConstructionModule } from '../construction/construction.module';
import { CrmModule } from '../crm/crm.module';
import { DossiersModule } from '../dossiers/dossiers.module';
import { LocatifModule } from '../locatif/locatif.module';
import { MandatsModule } from '../mandats/mandats.module';
import { TachesModule } from '../taches/taches.module';
import { VentesModule } from '../ventes/ventes.module';
import { AgendaController } from './agenda.controller';
import { AgendaSchedulerService } from './agenda-scheduler.service';
import { AgendaService } from './agenda.service';

/** Agenda partagé et individuel (J2.4, section 21 du cahier des charges). */
@Module({
  imports: [
    AuditModule,
    ConstructionModule,
    CrmModule,
    DossiersModule,
    LocatifModule,
    MandatsModule,
    TachesModule,
    VentesModule,
  ],
  controllers: [AgendaController],
  providers: [AgendaService, AgendaSchedulerService],
  exports: [AgendaService],
})
export class AgendaModule {}
