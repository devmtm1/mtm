import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Séjour de courte durée saisi par MTM (appel, WhatsApp, Airbnb…). Le prix, le
 * ménage et la caution partent des tarifs du bien et peuvent être ajustés pour
 * ce séjour-là.
 */
export class CreateSejourDto {
  @IsUUID() bienLocatifId!: string;
  /** Le voyageur : une fiche locataire. */
  @IsUUID() locataireId!: string;
  @IsDateString() dateArrivee!: string;
  @IsDateString() dateDepart!: string;
  /** Quand la réservation a été faite ; maintenant si omis. */
  @IsOptional() @IsDateString() dateReservation?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  nombreVoyageurs?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) prixNuit?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) fraisMenage?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) remise?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) cautionMontant?: number;
  @IsOptional() @IsString() @MaxLength(40) source?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  /** « confirmee » par défaut ; « demande » pour une réservation à valider. */
  @IsOptional() @IsIn(['demande', 'confirmee']) statut?: string;
}

/** Modification d'un séjour pas encore commencé. */
export class UpdateSejourDto {
  @IsOptional() @IsDateString() dateArrivee?: string;
  @IsOptional() @IsDateString() dateDepart?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  nombreVoyageurs?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) prixNuit?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) fraisMenage?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) remise?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) cautionMontant?: number;
  @IsOptional() @IsString() @MaxLength(40) source?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class TransitionSejourDto {
  @IsIn(['confirmee', 'en_cours', 'terminee']) statut!: string;
}

export class AnnulerSejourDto {
  @IsString() @Length(3, 1000) motif!: string;
}

export class QuerySejourDto {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsUUID() bienLocatifId?: string;
  @IsOptional() @IsString() @MaxLength(30) statut?: string;
  /** Vues rapides : à traiter (demandes), à venir, en cours, caution à régler. */
  @IsOptional()
  @IsIn(['a_traiter', 'a_venir', 'en_cours', 'caution_a_regler', 'termines'])
  vue?: string;
  /** Fenêtre du calendrier : séjours qui recouvrent cette période. */
  @IsOptional() @IsDateString() du?: string;
  @IsOptional() @IsDateString() au?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) pageSize = 25;
}

/** Règlement d'un séjour : acompte à la réservation, solde à l'arrivée. */
export class CreatePaiementSejourDto {
  @IsOptional() @IsDateString() datePaiement?: string;
  @Type(() => Number) @IsNumber() @IsPositive() montant!: number;
  @IsOptional() @IsString() @MaxLength(30) type?: string;
  @IsString() @MaxLength(40) mode!: string;
  @IsOptional() @IsString() @MaxLength(120) reference?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

/** Caution reçue du voyageur. */
export class VerserCautionSejourDto {
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() montant?: number;
  @IsOptional() @IsDateString() date?: string;
}

/** Restitution de la caution à la fin du séjour, avec une éventuelle retenue justifiée. */
export class RestituerCautionSejourDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) retenue?: number;
  @IsOptional() @IsString() @MaxLength(1000) justification?: string;
  @IsOptional() @IsDateString() date?: string;
}

/**
 * Demande de séjour déposée par un visiteur sur le site : pas de compte, pas de
 * paiement en ligne. MTM la reçoit, la confirme et recontacte le voyageur.
 */
export class DemandeSejourPublicDto {
  @IsString() @Length(1, 120) prenom!: string;
  @IsString() @Length(1, 120) nom!: string;
  @IsString() @Length(6, 40) telephone!: string;
  @IsOptional() @IsEmail() @MaxLength(200) email?: string;
  @IsDateString() dateArrivee!: string;
  @IsDateString() dateDepart!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(50) nombreVoyageurs!: number;
  @IsOptional() @IsString() @MaxLength(1000) message?: string;
}
