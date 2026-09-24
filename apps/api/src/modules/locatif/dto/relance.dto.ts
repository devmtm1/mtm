import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

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
