import { Module } from '@nestjs/common';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { TerrainsModule } from '../terrains/terrains.module';
import { MandatsModule } from '../mandats/mandats.module';
import { VentesModule } from '../ventes/ventes.module';
import { CrmModule } from '../crm/crm.module';
import { DemarchesModule } from '../demarches/demarches.module';
import { LocatifModule } from '../locatif/locatif.module';
import { ConstructionModule } from '../construction/construction.module';
import { GedController } from './ged.controller';
import { GedService } from './ged.service';

/** GED (section 17 CDC) : vue unique sur les documents de tous les modules. */
@Module({
  imports: [
    TerrainsModule,
    MandatsModule,
    VentesModule,
    CrmModule,
    DemarchesModule,
    LocatifModule,
    ConstructionModule,
  ],
  controllers: [GedController],
  providers: [GedService, CloudinaryService],
})
export class GedModule {}
