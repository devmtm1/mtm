import { Type } from 'class-transformer';
import {
  IsDateString,
  IsUUID,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Une étape réalisée sur une mission : constat de visite (étape 3) ou
 * administration consultée (étape 4). Les deux partagent la même trace —
 * qui, quand, ce qui a été observé — et ne diffèrent que par leurs champs
 * propres.
 */
export class CreateEtapeMissionDto {
  @IsString() @MaxLength(60) type!: string;
  @IsString() @MaxLength(200) titre!: string;
  @IsOptional() @IsString() @MaxLength(4000) observations?: string;

  // --- Vérification physique (étape 3) ---
  @IsOptional() @IsDateString() dateVisite?: string;
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
  @IsOptional() @IsString() @MaxLength(1000) accesDescription?: string;
  @IsOptional() @IsString() @MaxLength(1000) environnement?: string;
  @IsOptional() @IsString() @MaxLength(40) conformiteApparente?: string;

  // --- Vérification administrative (étape 4) ---
  @IsOptional() @IsString() @MaxLength(60) administration?: string;
  @IsOptional() @IsString() @MaxLength(200) interlocuteur?: string;
  @IsOptional() @IsString() @MaxLength(40) resultat?: string;

  @IsOptional() @IsDateString() realiseeLe?: string;
}

export class UpdateEtapeMissionDto {
  @IsOptional() @IsString() @MaxLength(200) titre?: string;
  @IsOptional() @IsString() @MaxLength(4000) observations?: string;
  @IsOptional() @IsDateString() dateVisite?: string;
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
  @IsOptional() @IsString() @MaxLength(1000) accesDescription?: string;
  @IsOptional() @IsString() @MaxLength(1000) environnement?: string;
  @IsOptional() @IsString() @MaxLength(40) conformiteApparente?: string;
  @IsOptional() @IsString() @MaxLength(60) administration?: string;
  @IsOptional() @IsString() @MaxLength(200) interlocuteur?: string;
  @IsOptional() @IsString() @MaxLength(40) resultat?: string;
  @IsOptional() @IsDateString() realiseeLe?: string;
}

/** Pièce jointe d'une mission : photo de visite, pièce fournie, rapport. */
export class CreateDocumentMissionDto {
  @IsString() @MaxLength(60) type!: string;
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  /**
   * Constat auquel rattacher la pièce : la photo est alors montrée sous la
   * visite concernée, au lieu de se perdre dans le dossier.
   */
  @IsOptional() @IsUUID() etapeId?: string;
}
