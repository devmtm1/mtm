import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import { versBooleen } from '../../../common/utils/booleen.transform';

export class CreateTerrainAssetDto {
  @IsString() @Length(1, 100) type!: string;
  @IsOptional() @IsString() @Length(1, 200) title?: string;
  @IsOptional()
  @Transform(versBooleen)
  @IsBoolean()
  isPublic?: boolean;
}
