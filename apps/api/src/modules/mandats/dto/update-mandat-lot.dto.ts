import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateMandatLotDto {
  @ApiPropertyOptional() @IsOptional() @IsString() statutLot?: string;
}
