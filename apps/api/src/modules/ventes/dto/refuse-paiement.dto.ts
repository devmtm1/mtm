import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/** Refus d'un paiement en attente : le motif est obligatoire et conservé. */
export class RefusePaiementDto {
  @ApiProperty({ example: 'Virement non retrouvé sur le relevé bancaire' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  motif!: string;
}
