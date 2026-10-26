import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Natures d'une propriété qui regroupe plusieurs logements. */
export const TYPES_IMMEUBLE = [
  'villa',
  'immeuble',
  'residence',
  'autre',
] as const;

/** Un logement à créer dans une propriété : ce qui le distingue des autres. */
export class LogementInitialDto {
  /** Repère dans la propriété : A1, Rez-de-chaussée, Appartement 2… */
  @IsOptional() @IsString() @MaxLength(40) numeroLot?: string;
  @IsOptional() @IsString() @MaxLength(160) titre?: string;
  @IsString() @MaxLength(60) type!: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) superficie?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50)
  nombrePieces?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(30)
  nombreChambres?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(30)
  nombreSallesEau?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) loyerMensuel?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) charges?: number;
  @IsOptional() @IsBoolean() meuble?: boolean;
}

export class CreateImmeubleDto {
  @IsString() @MaxLength(160) nom!: string;
  @IsOptional() @IsIn(TYPES_IMMEUBLE) type?: string;
  @IsUUID() proprietaireId!: string;
  @IsOptional() @IsUUID() responsableId?: string;
  @IsString() @MaxLength(500) adresse!: string;
  @IsOptional() @IsString() @MaxLength(120) commune?: string;
  @IsOptional() @IsString() @MaxLength(120) region?: string;
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
  @Max(100)
  tauxGestion?: number;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;

  /** Logements à créer en même temps que la propriété (facultatif : on peut les ajouter ensuite). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => LogementInitialDto)
  logements?: LogementInitialDto[];
}

export class UpdateImmeubleDto {
  @IsOptional() @IsString() @MaxLength(160) nom?: string;
  @IsOptional() @IsIn(TYPES_IMMEUBLE) type?: string;
  @IsOptional() @IsUUID() proprietaireId?: string;
  @IsOptional() @IsUUID() responsableId?: string;
  @IsOptional() @IsString() @MaxLength(500) adresse?: string;
  @IsOptional() @IsString() @MaxLength(120) commune?: string;
  @IsOptional() @IsString() @MaxLength(120) region?: string;
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
  @Max(100)
  tauxGestion?: number;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class AjouterLogementsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => LogementInitialDto)
  logements!: LogementInitialDto[];
}

export class QueryImmeubleDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsUUID() proprietaireId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) pageSize = 25;
}
