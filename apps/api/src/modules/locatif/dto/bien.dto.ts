import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Fiche bien locatif (section 15 du cahier des charges, étape 1 de J2.1). */
export class CreateBienDto {
  @IsUUID() proprietaireId!: string;
  @IsString() @MaxLength(60) type!: string;
  @IsString() @MaxLength(500) adresse!: string;
  @IsOptional() @IsString() @MaxLength(120) commune?: string;
  @IsOptional() @IsString() @MaxLength(120) region?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) superficie?: number;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsUUID() responsableId?: string;
}

export class UpdateBienDto {
  @IsOptional() @IsUUID() proprietaireId?: string;
  @IsOptional() @IsString() @MaxLength(60) type?: string;
  @IsOptional() @IsString() @MaxLength(500) adresse?: string;
  @IsOptional() @IsString() @MaxLength(120) commune?: string;
  @IsOptional() @IsString() @MaxLength(120) region?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) superficie?: number;
  @IsOptional() @IsString() @MaxLength(40) statut?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsUUID() responsableId?: string;
}

export class QueryBienDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() statut?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsUUID() proprietaireId?: string;
  @IsOptional() @IsUUID() responsableId?: string;
  /**
   * Vues rapides : biens loués, disponibles, sans responsable, en retard de
   * loyer, ou en impayé prolongé (cas particulier de la section 15).
   */
  @IsOptional()
  @IsIn([
    'loue',
    'disponible',
    'sans_responsable',
    'loyers_en_retard',
    'impayes_prolonges',
  ])
  vue?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) pageSize = 25;
  @IsOptional()
  @IsIn(['referenceInterne', 'statut', 'createdAt'])
  sortBy = 'createdAt';
  @IsOptional() @IsIn(['asc', 'desc']) sortOrder: 'asc' | 'desc' = 'desc';
}
