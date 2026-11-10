import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ContentBlockController } from './content-block.controller';
import { ContentBlockService } from './content-block.service';
import { ShowcaseItemController } from './showcase-item.controller';
import { ShowcaseItemService } from './showcase-item.service';
import { PromotionController } from './promotion.controller';
import { PromotionService } from './promotion.service';
import { PublicationController } from './publication.controller';
import { PublicationService } from './publication.service';
import { TeamMemberController } from './team-member.controller';
import { TeamMemberService } from './team-member.service';
import { PoleController } from './pole.controller';
import { PoleService } from './pole.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';

@Module({
  imports: [AuditModule],
  controllers: [
    ContentBlockController,
    ShowcaseItemController,
    TeamMemberController,
    PoleController,
    PromotionController,
    PublicationController,
  ],
  providers: [
    ContentBlockService,
    ShowcaseItemService,
    TeamMemberService,
    PoleService,
    PromotionService,
    PublicationService,
    CloudinaryService,
  ],
  exports: [ContentBlockService, ShowcaseItemService],
})
export class ContentBlockModule {}
