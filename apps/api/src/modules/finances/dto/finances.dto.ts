import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ACTIVITES } from '../finances.calculs';

export const SENS_OPERATION = ['recette', 'depense'] as const;
export const STATUTS_OPERATION = ['en_attente', 'validee', 'rejetee'] as const;

export class QueryPeriodeDto {
  /** Premier jour inclus (AAAA-MM-JJ). Par défaut : début du mois en cours. */
  @IsOptional()
  @IsDateString()
  du?: string;

  /** Dernier jour inclus (AAAA-MM-JJ). Par défaut : aujourd’hui. */
  @IsOptional()
  @IsDateString()
  au?: string;
}

export class QueryJournalDto extends QueryPeriodeDto {
  @IsOptional()
  @IsIn(ACTIVITES)
  activite?: string;

  @IsOptional()
  @IsIn(['entree', 'sortie'])
  sens?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize = 50;
}

export class CreateOperationDto {
  @IsIn(SENS_OPERATION)
  sens!: string;

  @IsIn(ACTIVITES)
  activite!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  categorie!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  libelle!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  @Max(1_000_000_000_000)
  montant!: number;

  /** AAAA-MM-JJ, jamais dans le futur. */
  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  modePaiement?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  tiers?: string;
}

export class UpdateOperationDto {
  @IsOptional()
  @IsIn(SENS_OPERATION)
  sens?: string;

  @IsOptional()
  @IsIn(ACTIVITES)
  activite?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  categorie?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  libelle?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  @Max(1_000_000_000_000)
  montant?: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  modePaiement?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  tiers?: string;
}

export class QueryOperationsDto {
  @IsOptional()
  @IsIn(STATUTS_OPERATION)
  statut?: string;

  @IsOptional()
  @IsIn(ACTIVITES)
  activite?: string;

  @IsOptional()
  @IsIn(SENS_OPERATION)
  sens?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;
}

export class RejetOperationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  motif!: string;
}

export class ClotureDto {
  /** AAAA-MM */
  @IsString()
  periode!: string;
}

export class JustificationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  justification!: string;
}

export class ExportDto extends QueryPeriodeDto {
  @IsIn(['csv', 'xlsx'])
  format!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(300)
  justification!: string;
}
