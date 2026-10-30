import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

/**
 * Envoi d'une relance (section 15). L'e-mail part depuis le back-office ; les
 * canaux SMS et WhatsApp relèvent de J2.4 et se tracent pour l'instant en
 * « manuel », une fois la relance passée par le gestionnaire.
 */
export class EnvoyerRelanceDto {
  @IsOptional() @IsIn(['email', 'manuel']) canal?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class QueryRelanceDto {
  @IsOptional() @IsIn(['a_envoyer', 'envoyee', 'annulee']) statut?: string;
  @IsOptional() @IsUUID() bienLocatifId?: string;
}

/** La file de relances paginée : mêmes filtres, plus la page demandée. */
export class QueryRelancePageDto extends QueryRelanceDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 25;
}
