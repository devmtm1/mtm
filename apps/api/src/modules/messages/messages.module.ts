import { Module } from '@nestjs/common';
import { DossiersModule } from '../dossiers/dossiers.module';
import {
  MessagesClientController,
  MessagesController,
} from './messages.controller';
import { MessagesService } from './messages.service';

/** Fil de discussion par dossier (J2.4, section 22 du cahier des charges). */
@Module({
  imports: [DossiersModule],
  // Le contrôleur « client » d'abord : ses routes plus longues ne doivent pas être prises pour un type de dossier.
  controllers: [MessagesClientController, MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
