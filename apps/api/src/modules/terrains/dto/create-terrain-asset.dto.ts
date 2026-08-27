import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateTerrainAssetDto {
  @IsString() @Length(1, 100) type!: string;
  @IsOptional() @IsString() @Length(1, 200) title?: string;
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isPublic?: boolean;
}
