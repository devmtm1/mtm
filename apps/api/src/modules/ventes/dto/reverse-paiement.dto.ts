import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { versBooleen } from '../../../common/utils/booleen.transform';

/**
 * Contre-passation d'un paiement déjà validé : saisie erronée, paiement
 * rejeté par la banque, ou remboursement au client. Le motif est obligatoire
 * et conservé ; le paiement d'origine n'est jamais supprimé.
 */
export class ReversePaiementDto {
  @ApiProperty({ example: 'Remboursement du client suite à l’annulation' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  motif!: string;

  @ApiPropertyOptional({
    description: 'Vrai si l’argent a effectivement été rendu au client.',
  })
  @IsOptional()
  @Transform(versBooleen)
  @IsBoolean()
  remboursement?: boolean;

  @ApiPropertyOptional({ example: 'VIR-REMB-0042' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  referenceRemboursement?: string;
}
