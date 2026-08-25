import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateTerrainAssetDto {
  @IsString() @Length(1, 100) type!: string;
  @IsOptional() @IsString() @Length(1, 200) title?: string;
  @IsOptional() @IsBoolean() isPublic?: boolean;
}