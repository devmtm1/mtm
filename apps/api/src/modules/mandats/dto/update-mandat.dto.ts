import { PartialType } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Length } from 'class-validator';
import { CreateMandatDto } from './create-mandat.dto';

export class UpdateMandatDto extends PartialType(CreateMandatDto) {
  @IsOptional() @IsString() @Length(1, 500) justification?: string;
}
