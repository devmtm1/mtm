import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { versBooleen } from '../../../common/utils/booleen.transform';

/** Un chemin du site (/catalogue) ou une adresse https : jamais javascript:, data: ni http. */
export const LIEN_PROMOTION = /^(\/(?!\/)[^\s]*|https:\/\/[^\s]+)$/;

export class CreatePromotionDto {
  @ApiProperty({ example: 'Promotion de rentrée' })
  @IsString()
  @Length(2, 160)
  titre!: string;

  @ApiPropertyOptional({
    example: 'Frais de dossier offerts jusqu’au 30 octobre',
  })
  @IsOptional()
  @IsString()
  @Length(0, 240)
  description?: string;

  @ApiPropertyOptional({ example: '/terrains' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  @Matches(LIEN_PROMOTION, {
    message:
      'Le lien doit être un chemin du site (/terrains) ou une adresse en https://',
  })
  lienUrl?: string;

  @ApiPropertyOptional({ example: 'Voir l’offre' })
  @IsOptional()
  @IsString()
  @Length(0, 60)
  libelleLien?: string;

  /** AAAA-MM-JJ ; `null` à la modification retire la limite. */
  @ApiPropertyOptional({ example: '2026-10-15', nullable: true })
  @IsOptional()
  @IsDateString()
  dateDebut?: string | null;

  @ApiPropertyOptional({ example: '2026-10-31', nullable: true })
  @IsOptional()
  @IsDateString()
  dateFin?: string | null;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  ordre?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(versBooleen)
  @IsBoolean()
  isActive?: boolean;
}
