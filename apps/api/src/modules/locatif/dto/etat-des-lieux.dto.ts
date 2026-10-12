import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ETATS_PIECE } from '../etat-des-lieux.helper';

/** L'état d'une pièce : bon, usure normale, dégradé ou hors service. */
export class PieceEtatDto {
  @IsString() @Length(1, 80) piece!: string;
  @IsIn([...ETATS_PIECE]) etat!: string;
  @IsOptional() @IsString() @MaxLength(500) observation?: string;
}

/**
 * État des lieux d'entrée ou de sortie. Réenregistrer le même type le remplace :
 * on corrige un état des lieux, on n'en accumule pas plusieurs.
 */
export class EtatDesLieuxDto {
  /** Date et heure de l'état des lieux ; maintenant si omis. */
  @IsOptional() @IsDateString() dateEtat?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => PieceEtatDto)
  pieces!: PieceEtatDto[];
  @IsOptional() @IsString() @MaxLength(40) releveEau?: string;
  @IsOptional() @IsString() @MaxLength(40) releveElectricite?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50)
  nombreCles?: number;
  @IsOptional() @IsString() @MaxLength(2000) observations?: string;
  /** Nom de la personne présente (voyageur, locataire), tel qu'il signe. */
  @IsOptional() @IsString() @MaxLength(200) signataire?: string;
}
