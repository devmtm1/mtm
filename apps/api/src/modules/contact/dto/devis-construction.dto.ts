import { ApiProperty } from '@nestjs/swagger';
import {
  Equals,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Natures de projets de construction proposées dans le formulaire du site. */
export const TYPES_PROJET_CONSTRUCTION = [
  'villa',
  'immeuble',
  'renovation',
  'amenagement',
  'autre',
] as const;

/** Où en est le terrain : le projet n'avance pas pareil selon que le client en a un ou non. */
export const SITUATIONS_TERRAIN = ['possede', 'a_trouver'] as const;

/**
 * Demande de devis pour un projet de construction (page « Construction » du site). Comme pour la gestion locative,
 * la demande rejoint les messages du site avec ses champs, et un collaborateur rappelle : rien n'est créé en base
 * métier avant sa validation.
 */
export class DevisConstructionDto {
  @ApiProperty({ example: 'Fatou Diop' })
  @IsString()
  @Length(2, 200)
  nom!: string;

  @ApiProperty({ example: 'fatou@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '+221 77 000 00 00' })
  @IsString()
  @Length(4, 30)
  telephone!: string;

  @ApiProperty({ example: 'France', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 80)
  pays?: string;

  @ApiProperty({ enum: TYPES_PROJET_CONSTRUCTION })
  @IsIn(TYPES_PROJET_CONSTRUCTION)
  typeProjet!: string;

  @ApiProperty({ enum: SITUATIONS_TERRAIN })
  @IsIn(SITUATIONS_TERRAIN)
  terrain!: string;

  /** Où construire (ou rénover) : commune ou quartier. */
  @ApiProperty({ example: 'Saly' })
  @IsString()
  @Length(2, 120)
  commune!: string;

  /** Budget indicatif en FCFA (facultatif) : il aide à cadrer la réponse, il n'engage à rien. */
  @ApiProperty({ example: 40000000, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  budget?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1500)
  precisions?: string;

  @ApiProperty({ example: true })
  @Equals(true, {
    message: 'Le consentement est nécessaire pour être rappelé.',
  })
  consentement!: boolean;

  /** Piège à robots : rempli, la demande est ignorée sans le dire. */
  @IsOptional()
  @IsString()
  siteWeb?: string;
}
