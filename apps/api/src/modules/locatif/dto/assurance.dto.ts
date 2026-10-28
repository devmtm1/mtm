import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** Type de document des attestations d'assurance habitation. */
export const TYPE_ASSURANCE = 'assurance_habitation';

/** Dépôt d'une attestation par le locataire : le fichier est joint, la date de fin de validité est saisie. */
export class DepotAssuranceDto {
  @IsDateString() dateExpiration!: string;
}

export const DECISIONS_CONTROLE = ['valide', 'rejete'] as const;

/** Décision de MTM sur un document soumis à contrôle ; un refus s'accompagne d'un motif que le locataire lira. */
export class ControleDocumentDto {
  @IsIn(DECISIONS_CONTROLE) decision!: (typeof DECISIONS_CONTROLE)[number];
  @IsOptional() @IsString() @MaxLength(500) motif?: string;
}
