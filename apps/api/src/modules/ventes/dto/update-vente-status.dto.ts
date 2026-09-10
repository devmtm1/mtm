import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateVenteStatusDto {
  @ApiProperty({ example: 'reserve' })
  @IsString()
  statut!: string;
}
