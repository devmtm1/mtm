import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Versement de loyer (section 15 : avance, normal, partiel, régularisation).
 * Sans `echeanceId`, le montant est imputé sur les échéances impayées les
 * plus anciennes — utile pour une avance qui couvre plusieurs mois.
 */
export class CreatePaiementLoyerDto {
  @IsString() @MaxLength(40) type!: string;
  @Type(() => Number) @IsNumber() @Min(0.01) montant!: number;
  @IsOptional() @IsDateString() datePaiement?: string;
  @IsString() @MaxLength(40) modePaiement!: string;
  @IsOptional() @IsString() @MaxLength(120) reference?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsUUID() echeanceId?: string;
}

/** Refus d'un encaissement en attente, ou annulation d'un encaissement validé à tort. */
export class RejetPaiementDto {
  @IsString() @MaxLength(500) motif!: string;
}
