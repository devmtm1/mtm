import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateDossierVenteDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-4789-abcd-1234567890ab' })
  @IsUUID()
  prospectId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  terrainId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  mandatId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  commercialResponsableId?: string;

  @ApiPropertyOptional({ example: 25000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  prixVente?: number;

  @ApiPropertyOptional({ example: 'en_cours' })
  @IsOptional()
  @IsString()
  statut?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
