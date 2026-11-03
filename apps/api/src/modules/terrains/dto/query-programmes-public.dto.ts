import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/** Les filtres du catalogue public appliqués aux programmes : mêmes noms que pour les biens. */
export class QueryProgrammesPublicDto {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsString() @MaxLength(100) region?: string;
  @IsOptional() @IsString() @MaxLength(100) commune?: string;
  @IsOptional() @IsString() @MaxLength(100) statutJuridique?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) prixPublicMin?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) prixPublicMax?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) superficieMin?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) superficieMax?: number;
}
