import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateMandatLotDto {
  @ApiProperty() @IsString() terrainId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() statutLot?: string;
}
