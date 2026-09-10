import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ContentBlockController } from './content-block.controller';
import { ContentBlockService } from './content-block.service';
import { ShowcaseItemController } from './showcase-item.controller';
import { ShowcaseItemService } from './showcase-item.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';

@Module({
  imports: [AuditModule],
  controllers: [ContentBlockController, ShowcaseItemController],
  providers: [ContentBlockService, ShowcaseItemService, CloudinaryService],
  exports: [ContentBlockService, ShowcaseItemService],
})
export class ContentBlockModule {}
