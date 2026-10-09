import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateTeamMemberDto } from './create-team-member.dto';

/** La nature (directeur, groupe, membre) ne change pas après création ; la publication a sa route. */
export class UpdateTeamMemberDto extends PartialType(
  OmitType(CreateTeamMemberDto, ['kind', 'isActive'] as const),
) {}
