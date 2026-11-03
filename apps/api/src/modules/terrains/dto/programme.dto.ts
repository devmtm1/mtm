import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

/** Conditions de vente communes à un programme et à ses catégories de lots. */
export class ConditionsLotDto {
  @ApiPropertyOptional() @IsOptional() @IsString() modalitePaiement?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  dureeMoratoireMois?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  acompteMontant?: number;
}

export class CreateProgrammeDto extends ConditionsLotDto {
  @ApiProperty() @IsString() @Length(1, 200) nom!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() region?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() commune?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() localisationDetail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() proprietaireId?: string;
  @ApiProperty() @IsString() statutJuridique!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() typeDocumentFoncier?: string;
  @ApiProperty() @IsString() niveauVerification!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) prixLot?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() produitDirect?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionLot?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) margeLot?: number;
}

export class UpdateProgrammeDto extends ConditionsLotDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 200) nom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() region?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() commune?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() localisationDetail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() proprietaireId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() statutJuridique?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() typeDocumentFoncier?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() niveauVerification?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) prixLot?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() produitDirect?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionLot?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) margeLot?: number;
  @ApiPropertyOptional({
    description: 'Visible sur le site public tant qu’il reste un lot à vendre.',
  })
  @IsOptional()
  @IsBoolean()
  publie?: boolean;
  @ApiPropertyOptional({
    description:
      "Obligatoire quand on change la commission, la marge, le mode produit direct ou le propriétaire d'un programme qui a déjà des lots.",
  })
  @IsOptional()
  @IsString()
  justification?: string;
}

export class CreateCategorieLotDto extends ConditionsLotDto {
  @ApiProperty() @IsString() @Length(1, 80) nom!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) prixPublic?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) commission?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) marge?: number;
}

export class UpdateCategorieLotDto extends ConditionsLotDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 80) nom?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) prixPublic?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) commission?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) marge?: number;
}

/** Un visuel du programme pour le site public. */
export class CreateProgrammeMediaDto {
  @ApiProperty({ enum: ['photo', 'plan'] })
  @IsIn(['photo', 'plan'])
  type!: 'photo' | 'plan';
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;
}

/** « 30 lots de A-01 à A-30, 300 m² chacun » : création en série. */
export class GenererLotsDto {
  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(1)
  @Max(300)
  nombre!: number;
  @ApiPropertyOptional({
    example: 'A-',
    description: 'Début du numéro de lot.',
  })
  @IsOptional()
  @IsString()
  @Length(0, 10)
  prefixe?: string;
  @ApiPropertyOptional({
    example: 1,
    description: 'Premier rang, 1 par défaut.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99999)
  debut?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) superficie?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() uniteSuperficie?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() categorieLotId?: string;
}

/** Range plusieurs lots dans une catégorie (ou les en sort). */
export class AffecterLotsDto {
  @ApiProperty({ type: [String] })
  @IsUUID('all', { each: true })
  lotIds!: string[];
  @ApiPropertyOptional({ description: 'Absent ou null : retire la catégorie.' })
  @IsOptional()
  @IsUUID()
  categorieLotId?: string | null;
}

/** Mise en vente (ou retrait) de plusieurs lots : Réservé et Vendu viennent des dossiers de vente. */
export class StatutLotsDto {
  @ApiProperty({ type: [String] })
  @IsUUID('all', { each: true })
  lotIds!: string[];
  @ApiProperty({ enum: ['Brouillon', 'Disponible', 'Suspendu'] })
  @IsIn(['Brouillon', 'Disponible', 'Suspendu'])
  statut!: 'Brouillon' | 'Disponible' | 'Suspendu';
}
