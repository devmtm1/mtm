import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateMandatLotDto {
  @ApiProperty() @IsString() terrainId!: string;
  @ApiPropertyOptional() @IsString() statutLot?: string;
}
