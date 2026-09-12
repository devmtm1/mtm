import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Min,
} from 'class-validator';

/** Mois au format AAAA-MM (ex. 2026-09). */
export const PERIODE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export class UpsertObjectifDto {
  @ApiProperty() @IsUUID() commercialId!: string;

  @ApiProperty({ example: '2026-09', description: 'Mois ciblé (AAAA-MM)' })
  @IsString()
  @Matches(PERIODE_PATTERN, {
    message: 'La période doit être au format AAAA-MM',
  })
  periode!: string;

  @ApiPropertyOptional({ description: 'Nombre de ventes visé sur le mois' })
  @IsOptional()
  @IsInt()
  @Min(0)
  cibleVentes?: number;

  @ApiPropertyOptional({
    description: 'Chiffre d’affaires encaissé visé (FCFA)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cibleChiffreAffaires?: number;

  @ApiPropertyOptional({ description: 'Commissions validées visées (FCFA)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cibleCommissions?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}
