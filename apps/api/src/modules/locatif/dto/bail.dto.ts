import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Nouveau bail sur un bien (création initiale ou changement de locataire). */
export class CreateBailDto {
  @IsUUID() locataireId!: string;
  @Type(() => Number) @IsNumber() @Min(1) loyerMensuel!: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) charges?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(28)
  jourEcheance?: number;
  @IsDateString() dateDebut!: string;
  @IsOptional() @IsDateString() dateFin?: string;
  /** Caution prévue au bail (le montant initial de la section 15). */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) cautionMontant?: number;
  /**
   * Date d'encaissement de la caution. Renseignée, elle ouvre l'historique de
   * caution avec un versement : le statut ne reste pas « non versée » alors
   * que l'argent est encaissé.
   */
  @IsOptional() @IsDateString() cautionDate?: string;
  @IsOptional() @IsString() @MaxLength(2000) etatLieuxEntree?: string;
}

/**
 * Correction d'un bail en cours. La caution ne se corrige pas ici : elle a son
 * propre historique de mouvements (section 15), seul le montant prévu au
 * contrat reste modifiable.
 */
export class UpdateBailDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) loyerMensuel?: number;
  /** Mois à partir duquel le nouveau loyer s'applique (par défaut : le mois en cours). */
  @IsOptional() @IsDateString() loyerApplicableLe?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) charges?: number;
  @IsOptional() @IsDateString() dateFin?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) etatLieuxEntree?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) cautionMontant?: number;
}

/** Préavis donné par le locataire (ou constaté par MTM). */
export class PreavisBailDto {
  @IsDateString() preavisDonneLe!: string;
  @IsDateString() preavisDepartPrevu!: string;
}

/**
 * Sortie du locataire : état des lieux, régularisation, restitution de
 * caution. Les montants laissés vides prennent ceux du calcul de
 * régularisation (section 15) ; l'opérateur ne les devine plus.
 */
export class SortieBailDto {
  @IsDateString() dateSortieReelle!: string;
  @IsOptional() @IsString() @MaxLength(2000) etatLieuxSortie?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  regularisationMontant?: number;
  @IsOptional() @IsString() @MaxLength(2000) regularisationNotes?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) cautionRetenue?: number;
  @IsOptional() @IsString() @MaxLength(2000) cautionJustification?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cautionRembourseeMontant?: number;
  @IsOptional() @IsString() @MaxLength(2000) motifCloture?: string;
}

/** Cas particulier (section 15) : départ sans préavis, motif obligatoire. */
export class ResiliationSansPreavisDto {
  @IsString() @MaxLength(2000) motifCloture!: string;
  /** Date du départ constaté ; par défaut, aujourd'hui. */
  @IsOptional() @IsDateString() dateSortieReelle?: string;
}

/** Changement de locataire : clôt le bail en cours et ouvre le suivant sur le même bien. */
export class ChangerLocataireDto {
  @IsDateString() dateSortieReelle!: string;
  @IsOptional() @IsString() @MaxLength(2000) motifCloture?: string;
  @IsOptional() @IsString() @MaxLength(2000) etatLieuxSortie?: string;

  @ValidateNested()
  @Type(() => CreateBailDto)
  nouveauBail!: CreateBailDto;
}
