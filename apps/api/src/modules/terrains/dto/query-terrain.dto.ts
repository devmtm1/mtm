import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class QueryTerrainDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() statutJuridique?: string;
  @IsOptional() @IsString() niveauVerification?: string;
  @IsOptional() @IsString() statutCommercial?: string;
  @IsOptional() @IsBoolean() misEnAvant?: boolean;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() commune?: string;
  @IsOptional() @IsUUID() proprietaireId?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) superficieMin?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) superficieMax?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) prixPublicMin?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) prixPublicMax?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) pageSize = 25;
  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'referenceInterne', 'nom', 'superficie', 'prixPublic'])
  sortBy = 'createdAt';
  @IsOptional() @IsIn(['asc', 'desc']) sortOrder: 'asc' | 'desc' = 'desc';
}
