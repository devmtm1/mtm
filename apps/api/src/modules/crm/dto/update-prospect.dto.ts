import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';
import { CreateProspectDto } from './create-prospect.dto';

export class UpdateProspectDto extends PartialType(CreateProspectDto) {
  @IsOptional() @IsString() @Length(1, 500) justification?: string;
}
