import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { SettingsModule } from '../settings/settings.module';
import { VentesModule } from '../ventes/ventes.module';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';

/** Parcours configurables des dossiers (J2.4, section 21 du cahier des charges). */
@Module({
  imports: [AuditModule, SettingsModule, VentesModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
})
export class WorkflowsModule {}
