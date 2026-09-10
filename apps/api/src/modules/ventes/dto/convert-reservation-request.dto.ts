import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class ConvertReservationRequestDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
