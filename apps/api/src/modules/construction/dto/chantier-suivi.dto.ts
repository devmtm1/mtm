import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// ------------------------------------------------------------------
// Planning : jalons
// ------------------------------------------------------------------

export class CreateJalonDto {
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  libelle!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ordre?: number;

  /** Un jalon de trois mois ne pèse pas comme une réception de deux jours. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  poids?: number;

  @IsOptional()
  @IsISO8601()
  dateDebutPrevue?: string;

  @IsOptional()
  @IsISO8601()
  dateFinPrevue?: string;
}

export class UpdateJalonDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  libelle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ordre?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  poids?: number;

  @IsOptional()
  @IsISO8601()
  dateDebutPrevue?: string | null;

  @IsOptional()
  @IsISO8601()
  dateFinPrevue?: string | null;

  @IsOptional()
  @IsISO8601()
  dateDebutReelle?: string | null;

  @IsOptional()
  @IsISO8601()
  dateFinReelle?: string | null;

  @IsOptional()
  @IsString()
  statut?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  avancement?: number;
}

/** Réordonnancement du planning en une fois, après glisser-déposer. */
export class ReordonnerJalonsDto {
  @IsUUID('4', { each: true })
  ordre!: string[];
}

// ------------------------------------------------------------------
// Journal de chantier
// ------------------------------------------------------------------

export class CreateEntreeJournalDto {
  @IsISO8601()
  date!: string;

  @IsOptional()
  @IsUUID()
  jalonId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  intervenants?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2000)
  effectif?: number;

  @IsOptional()
  @IsString()
  meteo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  avancement?: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  observations?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  probleme?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  decisions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  prochaineAction?: string;

  /**
   * Une journée qui signale un problème est ouverte par défaut : elle
   * remonte dans les alertes tant que personne ne l'a soldée.
   */
  @IsOptional()
  @IsBoolean()
  resolu?: boolean;

  @IsOptional()
  @IsBoolean()
  visibleClient?: boolean;
}

export class UpdateEntreeJournalDto {
  @IsOptional()
  @IsISO8601()
  date?: string;

  @IsOptional()
  @IsUUID()
  jalonId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  intervenants?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2000)
  effectif?: number;

  @IsOptional()
  @IsString()
  meteo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  avancement?: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  observations?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  probleme?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  decisions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  prochaineAction?: string;

  @IsOptional()
  @IsBoolean()
  resolu?: boolean;

  @IsOptional()
  @IsBoolean()
  visibleClient?: boolean;
}

export class QueryJournalDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize = 30;

  @IsOptional()
  @IsISO8601()
  depuis?: string;

  @IsOptional()
  @IsISO8601()
  jusqua?: string;

  /** Ne remonter que les journées portant un problème non résolu. */
  @IsOptional()
  @IsString()
  vue?: string;
}

// ------------------------------------------------------------------
// Prestataires
// ------------------------------------------------------------------

export class CreateIntervenantDto {
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  nom!: string;

  @IsString()
  metier!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  telephone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montantContrat?: number;

  @IsOptional()
  @IsISO8601()
  dateDebut?: string;

  @IsOptional()
  @IsISO8601()
  dateFin?: string;

  @IsOptional()
  @IsString()
  statut?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateIntervenantDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  nom?: string;

  @IsOptional()
  @IsString()
  metier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  telephone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montantContrat?: number;

  @IsOptional()
  @IsISO8601()
  dateDebut?: string | null;

  @IsOptional()
  @IsISO8601()
  dateFin?: string | null;

  @IsOptional()
  @IsString()
  statut?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

// ------------------------------------------------------------------
// Budget prévisionnel et dépenses
// ------------------------------------------------------------------

export class CreateLigneBudgetDto {
  @IsString()
  poste!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  libelle!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantite?: number;

  @IsOptional()
  @IsString()
  unite?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  prixUnitaire?: number;

  /**
   * Facultatif quand quantité et prix unitaire sont fournis : le service le
   * calcule alors lui-même, pour qu'un total ne puisse pas contredire ses
   * propres lignes.
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montantPrevu?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateLigneBudgetDto {
  @IsOptional()
  @IsString()
  poste?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  libelle?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantite?: number;

  @IsOptional()
  @IsString()
  unite?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  prixUnitaire?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montantPrevu?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class CreateDepenseDto {
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  libelle!: string;

  @IsString()
  poste!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  montant!: number;

  @IsOptional()
  @IsISO8601()
  date?: string;

  @IsOptional()
  @IsUUID()
  ligneBudgetId?: string;

  @IsOptional()
  @IsUUID()
  intervenantId?: string;

  @IsOptional()
  @IsString()
  modePaiement?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;
}

/** Contrôle comptable d'une dépense : elle ne pèse qu'une fois validée. */
export class ValiderDepenseDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  motif?: string;
}
