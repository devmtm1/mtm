import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ArchiveTerrainDto {
  @ApiProperty({ description: 'Pourquoi le bien quitte le portefeuille actif' })
  @IsString()
  @Length(3, 500)
  motif!: string;
}
