import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({ example: 500000 })
  @IsNumber()
  @Min(0)
  montantAcompte!: number;

  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(1)
  dureeBlocageJours!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conditionsAnnulation?: string;
}
