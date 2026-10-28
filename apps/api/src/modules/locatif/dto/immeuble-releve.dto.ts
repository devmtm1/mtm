import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { REPARTITIONS_CHARGE } from '../releve-immeuble.helper';

/** Une charge commune de la propriété : ce qu'elle a coûté, quand, et comment la montrer par logement. */
export class CreateChargeImmeubleDto {
  @IsString() @MaxLength(120) libelle!: string;
  @Type(() => Number) @IsNumber() @Min(1) montant!: number;
  @IsDateString() dateCharge!: string;
  @IsOptional()
  @IsIn(REPARTITIONS_CHARGE)
  repartition?: (typeof REPARTITIONS_CHARGE)[number];
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
