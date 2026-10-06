import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateVenteStatusDto {
  @ApiProperty({ example: 'reserve' })
  @IsString()
  statut!: string;

  @ApiPropertyOptional({
    description:
      'Obligatoire pour annuler un dossier qui a déjà reçu des paiements validés : sort de ces paiements (conservés, remboursés…).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motif?: string;
}
