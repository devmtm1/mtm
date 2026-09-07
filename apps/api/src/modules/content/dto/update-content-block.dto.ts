import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateContentBlockDto } from './create-content-block.dto';

export class UpdateContentBlockDto extends PartialType(
	OmitType(CreateContentBlockDto, ['isActive'] as const),
) {}
