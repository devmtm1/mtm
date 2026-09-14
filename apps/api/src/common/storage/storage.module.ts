import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { FilesController } from './files.controller';

/** Téléchargement des documents privés (liens signés). */
@Module({
  controllers: [FilesController],
  providers: [CloudinaryService],
})
export class StorageModule {}
