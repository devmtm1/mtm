import { OmitType, PartialType } from '@nestjs/swagger';
import { CreatePoleDto } from './create-pole.dto';

/** La publication a sa propre route : elle ne se change pas avec le reste. */
export class UpdatePoleDto extends PartialType(
  OmitType(CreatePoleDto, ['isActive'] as const),
) {}
