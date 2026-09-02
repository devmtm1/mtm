import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class QueryMandatDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsUUID() proprietaireId?: string;
  @IsOptional() @IsUUID() commercialResponsableId?: string;
  @IsOptional() @IsString() statut?: string;
  @IsOptional() @IsDateString() dateDebutMin?: string;
  @IsOptional() @IsDateString() dateDebutMax?: string;
  @IsOptional() @IsDateString() dateFinMin?: string;
  @IsOptional() @IsDateString() dateFinMax?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) pageSize = 25;
  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'referenceInterne', 'dateDebut', 'dateFin'])
  sortBy = 'createdAt';
  @IsOptional() @IsIn(['asc', 'desc']) sortOrder: 'asc' | 'desc' = 'desc';
}
