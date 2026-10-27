import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { versBooleen } from '../../../common/utils/booleen.transform';

/**
 * Champs d'annonce d'un bien en location (site public). Partagés par la
 * création et la modification d'un bien : ce qui décrit le bien pour un
 * visiteur — loyer, pièces, équipements — et sa publication.
 */
export class AnnonceBienFields {
  @IsOptional() @IsString() @MaxLength(160) titre?: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) loyerMensuel?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) charges?: number;
  /** Caution demandée, en mois de loyer. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(12)
  moisCaution?: number;
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
  @IsOptional() @Transform(versBooleen) @IsBoolean() meuble?: boolean;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  equipements?: string[];
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
  @IsOptional() @IsDateString() disponibleLe?: string;

  // --- Courte durée ---
  /** « longue_duree » (bail, loyer mensuel) ou « courte_duree » (séjours de courte durée). */
  @IsOptional() @IsString() @MaxLength(30) modeLocation?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) prixNuit?: number;
  /** Caution demandée au voyageur, en FCFA. */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) cautionSejour?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) fraisMenage?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  nuitsMinimum?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  capaciteVoyageurs?: number;
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Heure attendue au format HH:MM',
  })
  heureArrivee?: string;
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Heure attendue au format HH:MM',
  })
  heureDepart?: string;
  /** Réservés à la permission locatif:publier (contrôlée par le contrôleur). */
  @IsOptional() @Transform(versBooleen) @IsBoolean() publie?: boolean;
  @IsOptional() @Transform(versBooleen) @IsBoolean() misEnAvant?: boolean;
}

/** Dépôt d'une photo ou d'une vidéo d'annonce. */
export class CreateBienMediaDto {
  @IsOptional() @IsString() @MaxLength(200) title?: string;
}

/** Nouvel ordre des photos : la première est la couverture. */
export class ReorderBienMediasDto {
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  ids!: string[];
}

/** Filtres du catalogue public des locations. */
export class QueryLocationPublicDto {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsString() @MaxLength(60) type?: string;
  @IsOptional() @IsString() @MaxLength(120) region?: string;
  @IsOptional() @IsString() @MaxLength(120) commune?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) loyerMin?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) loyerMax?: number;
  /** Mode de location : « courte_duree » (séjours de courte durée) ou « longue_duree ». */
  @IsOptional() @IsIn(['longue_duree', 'courte_duree']) mode?: string;
  /** Prix de la nuit : ne s'applique qu'aux séjours de courte durée. */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) prixNuitMax?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) voyageurs?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) chambresMin?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) superficieMin?: number;
  @IsOptional() @Transform(versBooleen) @IsBoolean() meuble?: boolean;
  @IsOptional() @Transform(versBooleen) @IsBoolean() misEnAvant?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 12;
  @IsOptional()
  @IsIn(['createdAt', 'loyerMensuel', 'prixNuit', 'superficie'])
  sortBy = 'createdAt';
  @IsOptional() @IsIn(['asc', 'desc']) sortOrder: 'asc' | 'desc' = 'desc';
}
