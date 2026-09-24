import { IsDateString, IsOptional } from 'class-validator';

/**
 * Relevé de gestion remis au propriétaire (backlog J2.1 : « espace
 * propriétaire — loyers, solde, rapports »). Par défaut, les douze derniers
 * mois.
 */
export class GenererReleveDto {
  @IsOptional() @IsDateString() periodeDebut?: string;
  @IsOptional() @IsDateString() periodeFin?: string;
}
