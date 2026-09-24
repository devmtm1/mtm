import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Incident ou demande sur un bail (sections 4 et 15 : l'espace locataire
 * couvre « incidents et demandes »).
 */
export class CreateIncidentDto {
  @IsOptional() @IsIn(['incident', 'demande']) nature?: string;
  @IsString() @MaxLength(60) type!: string;
  @IsString() @MaxLength(2000) description!: string;
}

export class UpdateIncidentDto {
  @IsOptional() @IsString() @MaxLength(40) statut?: string;
  @IsOptional() @IsString() @MaxLength(2000) resolutionNotes?: string;
}
