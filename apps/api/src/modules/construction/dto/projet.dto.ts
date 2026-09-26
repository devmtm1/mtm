import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Champs de tri acceptés sur la liste des chantiers. */
const TRIS = [
  'createdAt',
  'updatedAt',
  'intitule',
  'referenceInterne',
  'statut',
  'avancement',
  'dateFinPrevue',
  'montantDevis',
] as const;

/** Un booléen arrivant en query string vaut « true »/« 1 », pas `true`. */
const versBooleen = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === '1';

export class CreateProjetDto {
  @IsUUID()
  clientId!: string;

  @IsOptional()
  @IsUUID()
  terrainId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  intitule!: string;

  @IsString()
  typeProjet!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  programme?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  adresse?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  commune?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  region?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  surfaceBatie?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(200)
  nombreNiveaux?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montantDevis?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetPrevu?: number;

  @IsOptional()
  @IsISO8601()
  dateDebutPrevue?: string;

  @IsOptional()
  @IsISO8601()
  dateFinPrevue?: string;

  @IsOptional()
  @IsUUID()
  responsableId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;

  /**
   * Pose d'emblée le déroulé type d'une construction plutôt que de laisser
   * le conducteur de travaux saisir neuf jalons à la main. Les dates restent
   * à renseigner : seul l'enchaînement est proposé.
   */
  @IsOptional()
  @Transform(versBooleen)
  @IsBoolean()
  avecJalonsType?: boolean;
}

export class UpdateProjetDto {
  @IsOptional()
  @IsUUID()
  terrainId?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  intitule?: string;

  @IsOptional()
  @IsString()
  typeProjet?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  programme?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  adresse?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  commune?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  region?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  surfaceBatie?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(200)
  nombreNiveaux?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montantDevis?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetPrevu?: number;

  @IsOptional()
  @IsISO8601()
  dateDebutPrevue?: string | null;

  @IsOptional()
  @IsISO8601()
  dateFinPrevue?: string | null;

  @IsOptional()
  @IsISO8601()
  dateDebutReelle?: string | null;

  @IsOptional()
  @IsISO8601()
  dateFinReelle?: string | null;

  /**
   * Utile seulement pour un chantier sans jalon : dès qu'un jalon existe,
   * l'avancement se déduit du planning et la valeur saisie est écrasée.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  avancement?: number;

  @IsOptional()
  @IsUUID()
  responsableId?: string;

  @IsOptional()
  @IsBoolean()
  visibleClient?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}

/** Changement de statut du chantier, contrôlé à part de la simple saisie. */
export class TransitionProjetDto {
  @IsString()
  statut!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  motif?: string;

  @IsOptional()
  @IsISO8601()
  date?: string;
}

export class QueryProjetDto {
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
  pageSize = 25;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  statut?: string;

  @IsOptional()
  @IsString()
  typeProjet?: string;

  @IsOptional()
  @IsString()
  situationAlerte?: string;

  @IsOptional()
  @IsUUID()
  responsableId?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  /** Vues rapides du service : en cours, en retard, budget dépassé… */
  @IsOptional()
  @IsString()
  vue?: string;

  @IsOptional()
  @IsIn(TRIS)
  sortBy: (typeof TRIS)[number] = 'updatedAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}
