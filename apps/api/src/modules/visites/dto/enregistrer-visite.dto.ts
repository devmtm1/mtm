import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { SOURCES_VISITE, TYPES_VISITE } from '../visites.types';

export class EnregistrerVisiteDto {
  @ApiProperty({ enum: TYPES_VISITE })
  @IsIn(TYPES_VISITE)
  type!: (typeof TYPES_VISITE)[number];

  @ApiPropertyOptional({
    description: 'Identifiant de la fiche (absent pour « site »)',
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional({ enum: SOURCES_VISITE })
  @IsOptional()
  @IsIn(SOURCES_VISITE)
  source?: (typeof SOURCES_VISITE)[number];
}
