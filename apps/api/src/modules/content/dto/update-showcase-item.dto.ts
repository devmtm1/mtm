import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateShowcaseItemDto } from './create-showcase-item.dto';

export class UpdateShowcaseItemDto extends PartialType(
  OmitType(CreateShowcaseItemDto, ['isActive'] as const),
) {}
