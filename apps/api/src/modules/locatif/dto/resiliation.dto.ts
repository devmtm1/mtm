import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Demande de résiliation déposée par le locataire depuis son espace. */
export class DemandeResiliationDto {
  /** Date à laquelle le locataire souhaite avoir quitté le logement. */
  @IsDateString() dateDepartSouhaitee!: string;
  @IsOptional() @IsString() @MaxLength(60) motif?: string;
  @IsOptional() @IsString() @MaxLength(2000) message?: string;
}

/** Même demande, enregistrée par MTM après un appel, un message ou un courrier. */
export class DemandeResiliationStaffDto extends DemandeResiliationDto {
  @IsOptional() @IsString() @MaxLength(30) canal?: string;
  /** Quand le locataire a fait sa demande ; maintenant si omis. */
  @IsOptional() @IsDateString() dateDemande?: string;
}

/** Réponse de MTM : accepter (le préavis s'ouvre) ou refuser (avec la raison). */
export class TraiterResiliationDto {
  @IsIn(['acceptee', 'refusee']) decision!: string;
  /**
   * Date de départ retenue. Vide : la plus tardive entre le souhait du locataire
   * et la date de la demande augmentée du préavis.
   */
  @IsOptional() @IsDateString() dateDepartRetenue?: string;
  @IsOptional() @IsString() @Length(0, 2000) reponse?: string;
}

export class QueryResiliationDto {
  @IsOptional() @IsString() @MaxLength(30) statut?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) pageSize = 25;
}
