import { IsString, Length } from 'class-validator';
import { IsOptional } from 'class-validator';

export class UpdateTerrainStatusDto {
  @IsString() @Length(1, 100) value!: string;
  @IsOptional() @IsString() @Length(1, 500) justification?: string;
}
