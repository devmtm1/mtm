import { OmitType, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';
import { CreateTerrainDto } from './create-terrain.dto';

export class UpdateTerrainDto extends PartialType(
  OmitType(CreateTerrainDto, ['statutJuridique', 'niveauVerification'] as const),
) {
  @IsOptional() @IsString() @Length(1, 500) justification?: string;
}
