import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Mouvement de caution (section 15 : « montant initial, date, statut,
 * retenues éventuelles, justification, remboursement et historique »).
 */
export class CreateMouvementCautionDto {
  @IsString() @MaxLength(40) type!: string;
  @Type(() => Number) @IsNumber() @Min(0.01) montant!: number;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsString() @MaxLength(2000) justification?: string;
}
