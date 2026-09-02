import { PartialType } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import { CreateProspectDto } from './create-prospect.dto';

export class UpdateProspectDto extends PartialType(CreateProspectDto) {
  @IsString() @Length(1, 500) justification?: string;
}
