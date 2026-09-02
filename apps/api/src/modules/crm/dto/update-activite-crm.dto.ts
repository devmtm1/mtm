import { PartialType } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import { CreateActiviteCrmDto } from './create-activite-crm.dto';

export class UpdateActiviteCrmDto extends PartialType(CreateActiviteCrmDto) {
  @IsString() @Length(1, 500) justification?: string;
}
