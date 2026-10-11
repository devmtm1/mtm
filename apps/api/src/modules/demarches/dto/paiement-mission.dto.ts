import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/** Règlement reçu pour une mission : un acompte, un solde, un versement Wave. */
export class CreatePaiementMissionDto {
  /** Date et heure du règlement ; maintenant si omis. */
  @IsOptional() @IsDateString() datePaiement?: string;
  /** Montant envoyé par le client, frais non déduits. */
  @Type(() => Number) @IsNumber() @IsPositive() montantEnvoye!: number;
  /** Frais de transfert (Wave, Orange Money…), 0 si aucun. */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) frais?: number;
  @IsString() @MaxLength(40) mode!: string;
  /** Identifiant de la transaction (ID Wave, numéro de virement…). */
  @IsOptional() @IsString() @MaxLength(120) reference?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class UpdatePaiementMissionDto {
  @IsOptional() @IsDateString() datePaiement?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  montantEnvoye?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) frais?: number;
  @IsOptional() @IsString() @MaxLength(40) mode?: string;
  @IsOptional() @IsString() @MaxLength(120) reference?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
