import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Étape 1 du cahier des charges : la demande du client. Le terrain peut ne
 * pas exister au catalogue — un client de la diaspora décrit souvent un
 * terrain qu'on lui propose ailleurs —, d'où la localisation libre.
 */
export class CreateMissionDto {
  @IsUUID() prospectId!: string;
  @IsOptional() @IsUUID() terrainId?: string;
  @IsString() @MaxLength(80) typeVerification!: string;
  @IsOptional() @IsString() @MaxLength(2000) objectif?: string;
  @IsOptional() @IsString() @MaxLength(500) localisation?: string;
  @IsOptional() @IsString() @MaxLength(120) region?: string;
  @IsOptional() @IsString() @MaxLength(120) commune?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
  @IsOptional() @IsString() @MaxLength(2000) piecesFournies?: string;
  @IsOptional() @IsString() @MaxLength(40) urgence?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) budgetAnnonce?: number;
  @IsOptional() @IsDateString() dateDemande?: string;
  @IsOptional() @IsDateString() dateEcheance?: string;
  @IsOptional() @IsUUID() responsableId?: string;
  @IsOptional() @IsString() @MaxLength(60) statut?: string;
}

/** Mise à jour : demande, étude de faisabilité, facturation et conclusion. */
export class UpdateMissionDto {
  @IsOptional() @IsUUID() terrainId?: string;
  @IsOptional() @IsString() @MaxLength(80) typeVerification?: string;
  @IsOptional() @IsString() @MaxLength(2000) objectif?: string;
  @IsOptional() @IsString() @MaxLength(500) localisation?: string;
  @IsOptional() @IsString() @MaxLength(120) region?: string;
  @IsOptional() @IsString() @MaxLength(120) commune?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
  @IsOptional() @IsString() @MaxLength(2000) piecesFournies?: string;
  @IsOptional() @IsString() @MaxLength(40) urgence?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) budgetAnnonce?: number;
  @IsOptional() @IsDateString() dateEcheance?: string;
  @IsOptional() @IsUUID() responsableId?: string;

  // --- Étape 2 : étude de faisabilité et facturation ---
  @IsOptional() @IsString() @MaxLength(40) faisabiliteConclusion?: string;
  @IsOptional() @IsString() @MaxLength(4000) faisabiliteNotes?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) montantDevis?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) fraisEtude?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) montantPaye?: number;
  @IsOptional() @IsString() @MaxLength(40) modePaiement?: string;
  @IsOptional() @IsString() @MaxLength(120) referencePaiement?: string;

  // --- Étape 5 : conclusion du rapport ---
  @IsOptional() @IsString() @MaxLength(40) decision?: string;
  @IsOptional() @IsString() @MaxLength(4000) conclusion?: string;
  @IsOptional() @IsString() @MaxLength(4000) reserves?: string;
  @IsOptional() @IsString() @MaxLength(4000) recommandation?: string;

  @IsOptional() @IsBoolean() visibleClient?: boolean;
}

/** Changement d'étape, avec la justification exigée pour un abandon. */
export class TransitionMissionDto {
  @IsString() @MaxLength(60) statut!: string;
  @IsOptional() @IsString() @MaxLength(1000) justification?: string;
}

export class QueryMissionDto {
  /** Référence, nom du client, commune ou localisation libre. */
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() statut?: string;
  @IsOptional() @IsString() typeVerification?: string;
  @IsOptional() @IsString() urgence?: string;
  @IsOptional() @IsUUID() responsableId?: string;
  @IsOptional() @IsUUID() prospectId?: string;
  /** Vues rapides : missions en cours, en retard, sans responsable. */
  @IsOptional()
  @IsIn(['en_cours', 'en_retard', 'sans_responsable', 'a_rapporter'])
  vue?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) pageSize = 25;
  @IsOptional()
  @IsIn(['dateDemande', 'dateEcheance', 'statut', 'createdAt'])
  sortBy = 'createdAt';
  @IsOptional() @IsIn(['asc', 'desc']) sortOrder: 'asc' | 'desc' = 'desc';
}
