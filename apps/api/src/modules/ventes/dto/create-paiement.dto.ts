import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePaiementDto {
  @ApiProperty({ example: 500000 })
  @IsNumber()
  @Min(0.01)
  montant!: number;

  @ApiProperty({ example: 'virement' })
  @IsString()
  mode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  datePaiement?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  justificatifUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
