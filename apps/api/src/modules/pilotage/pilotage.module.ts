import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FinancesModule } from '../finances/finances.module';
import { SettingsModule } from '../settings/settings.module';
import { VentesModule } from '../ventes/ventes.module';
import { EnvoiAutomatiqueService } from './envoi-automatique.service';
import { ReglagesPilotageService } from './reglages-pilotage.service';
import { DossiersBloquesService } from './dossiers-bloques.service';
import { PilotageController } from './pilotage.controller';
import { RapportsService } from './rapports.service';
import { TableauxService } from './tableaux.service';

/** Tableaux de bord et rapports (J3.2, section 23 du cahier des charges). */
@Module({
  imports: [AuditModule, FinancesModule, SettingsModule, VentesModule],
  controllers: [PilotageController],
  providers: [
    TableauxService,
    DossiersBloquesService,
    RapportsService,
    EnvoiAutomatiqueService,
    ReglagesPilotageService,
  ],
})
export class PilotageModule {}
