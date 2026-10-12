import { Module } from '@nestjs/common';
import { ConstructionModule } from '../construction/construction.module';
import { CrmModule } from '../crm/crm.module';
import { DemarchesModule } from '../demarches/demarches.module';
import { LocatifModule } from '../locatif/locatif.module';
import { MandatsModule } from '../mandats/mandats.module';
import { TerrainsModule } from '../terrains/terrains.module';
import { VentesModule } from '../ventes/ventes.module';
import { DossierLienService } from './dossier-lien.service';

/**
 * Rattachement d'une tâche, d'un événement ou d'un message à un dossier, avec
 * le contrôle d'accès du module propriétaire du dossier.
 */
@Module({
  imports: [
    ConstructionModule,
    CrmModule,
    DemarchesModule,
    LocatifModule,
    MandatsModule,
    TerrainsModule,
    VentesModule,
  ],
  providers: [DossierLienService],
  exports: [DossierLienService],
})
export class DossiersModule {}
