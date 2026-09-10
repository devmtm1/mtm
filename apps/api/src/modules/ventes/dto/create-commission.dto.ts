import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateCommissionDto {
  @ApiProperty()
  @IsUUID()
  commercialId!: string;

  @ApiProperty({ example: 'commercial-standard' })
  @IsString()
  regleId!: string;

  @ApiPropertyOptional({
    example: 2.5,
    description: 'Pourcentage de commission',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taux?: number;

  @ApiPropertyOptional({
    example: 250000,
    description: 'Montant forfaitaire de commission',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  montantFixe?: number;

  @ApiPropertyOptional({
    example: 500000,
    description:
      'Seuil de vente au-delà duquel le bonus ou le palier s’applique',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  palier?: number;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Bonus complémentaire appliqué au-delà du palier',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bonus?: number;
}
