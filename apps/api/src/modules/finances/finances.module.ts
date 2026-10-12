import { Global, Module } from '@nestjs/common';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { AuditModule } from '../audit/audit.module';
import { SettingsModule } from '../settings/settings.module';
import { ExportFinancesService } from './export.service';
import { FinancesController } from './finances.controller';
import { FinancesService } from './finances.service';
import { FluxFinanciersService } from './flux.service';
import { OperationsFinancieresService } from './operations.service';
import { PeriodesFinancieresService } from './periodes.service';

/**
 * Finances (J3.1, section 18 du cahier des charges). Global : les modules qui
 * enregistrent un mouvement d'argent consultent `PeriodesFinancieresService`
 * pour refuser toute modification d'un mois clôturé.
 */
@Global()
@Module({
  imports: [AuditModule, SettingsModule],
  controllers: [FinancesController],
  providers: [
    CloudinaryService,
    FinancesService,
    FluxFinanciersService,
    OperationsFinancieresService,
    ExportFinancesService,
    PeriodesFinancieresService,
  ],
  exports: [PeriodesFinancieresService, FinancesService, FluxFinanciersService],
})
export class FinancesModule {}
