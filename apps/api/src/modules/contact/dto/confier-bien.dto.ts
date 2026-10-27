import { ApiProperty } from '@nestjs/swagger';
import {
  Equals,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Natures de biens qu'un propriétaire peut proposer à la gestion. */
export const TYPES_BIEN_CONFIE = [
  'appartement',
  'villa',
  'immeuble',
  'bureau',
  'commerce',
  'courte_duree',
  'autre',
] as const;

/** Situation actuelle du bien. */
export const SITUATIONS_BIEN_CONFIE = ['libre', 'loue', 'en_travaux'] as const;

/**
 * Demande d'un propriétaire qui souhaite confier un bien à MTM (page « Gestion locative » du site). Les champs sont
 * précis pour que l'équipe sache de quoi il s'agit sans rappeler ; rien n'est créé en base métier : un collaborateur
 * valide d'abord, comme pour tout message du site.
 */
export class ConfierBienDto {
  @ApiProperty({ example: 'Fatou Diop' })
  @IsString()
  @Length(2, 200)
  nom!: string;

  @ApiProperty({ example: 'fatou@example.com' })
  @IsEmail()
  email!: string;

  /** Obligatoire ici : c'est le canal du rappel (WhatsApp ou appel). */
  @ApiProperty({ example: '+221 77 000 00 00' })
  @IsString()
  @Length(4, 30)
  telephone!: string;

  @ApiProperty({ example: 'France', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 80)
  pays?: string;

  @ApiProperty({ enum: TYPES_BIEN_CONFIE })
  @IsIn(TYPES_BIEN_CONFIE)
  typeBien!: string;

  @ApiProperty({ example: 'Sacré-Cœur' })
  @IsString()
  @Length(2, 120)
  commune!: string;

  @ApiProperty({ example: 'Dakar', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  region?: string;

  /** Logements à gérer : plus d'un pour une villa divisée, un immeuble ou une résidence. */
  @ApiProperty({ example: 4, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  nombreLogements?: number;

  @ApiProperty({ enum: SITUATIONS_BIEN_CONFIE })
  @IsIn(SITUATIONS_BIEN_CONFIE)
  situation!: string;

  /** Loyer mensuel souhaité par logement, en FCFA (facultatif). */
  @ApiProperty({ example: 250000, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  loyerSouhaite?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1500)
  precisions?: string;

  /** Consentement au traitement des données pour être rappelé : sans lui, la demande est refusée. */
  @ApiProperty({ example: true })
  @Equals(true, {
    message: 'Le consentement est nécessaire pour être rappelé.',
  })
  consentement!: boolean;

  /**
   * Piège à robots : champ invisible pour un visiteur, que les robots remplissent. Rempli, la demande est ignorée
   * sans le dire (la réponse reste « succès »).
   */
  @IsOptional()
  @IsString()
  siteWeb?: string;
}
