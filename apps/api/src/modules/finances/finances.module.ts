import { Global, Module } from '@nestjs/common';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { AuditModule } from '../audit/audit.module';
import { SettingsModule } from '../settings/settings.module';
import { ChantiersFinanceController } from './chantiers-finance.controller';
import { ChantiersFinanceService } from './chantiers-finance.service';
import { ControleController } from './controle.controller';
import { ControleService } from './controle.service';
import { ExportFinancesService } from './export.service';
import { FinancesController } from './finances.controller';
import { FinancesService } from './finances.service';
import { FluxFinanciersService } from './flux.service';
import { OperationsFinancieresService } from './operations.service';
import { PeriodesFinancieresService } from './periodes.service';
import { PiecesService } from './pieces.service';
import { RapportQuotidienService } from './rapport-quotidien.service';
import { RapprochementController } from './rapprochement.controller';
import { RapprochementService } from './rapprochement.service';
import { RemboursementsController } from './remboursements.controller';
import { RemboursementsService } from './remboursements.service';
import { ReversementsController } from './reversements.controller';
import { ReversementsService } from './reversements.service';
import { TresorerieController } from './tresorerie.controller';
import { TresorerieService } from './tresorerie.service';

/**
 * Finances (J3.1, section 18 du cahier des charges). Global : les modules qui
 * enregistrent un mouvement d'argent consultent `PeriodesFinancieresService`
 * pour refuser toute modification d'un mois clôturé.
 */
@Global()
@Module({
  imports: [AuditModule, SettingsModule],
  controllers: [
    FinancesController,
    TresorerieController,
    ReversementsController,
    RemboursementsController,
    ChantiersFinanceController,
    ControleController,
    RapprochementController,
  ],
  providers: [
    CloudinaryService,
    FinancesService,
    FluxFinanciersService,
    OperationsFinancieresService,
    ExportFinancesService,
    PeriodesFinancieresService,
    PiecesService,
    TresorerieService,
    ReversementsService,
    RemboursementsService,
    ChantiersFinanceService,
    ControleService,
    RapportQuotidienService,
    RapprochementService,
  ],
  exports: [
    PeriodesFinancieresService,
    FinancesService,
    FluxFinanciersService,
    TresorerieService,
  ],
})
export class FinancesModule {}
