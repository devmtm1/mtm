import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PRIORITES_TACHE, STATUTS_TACHE } from '../taches.constants';
import { TYPES_DOSSIER } from '../../dossiers/dossier-lien.service';

export class CreateTacheDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  titre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsIn(PRIORITES_TACHE)
  priorite?: string;

  @IsOptional()
  @IsDateString()
  dateLimite?: string;

  /** Par défaut : la personne qui crée la tâche. */
  @IsOptional()
  @IsUUID()
  responsableId?: string;

  @IsOptional()
  @IsIn(TYPES_DOSSIER)
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;
}

export class UpdateTacheDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  titre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsIn(PRIORITES_TACHE)
  priorite?: string;

  @IsOptional()
  @IsIn(STATUTS_TACHE)
  statut?: string;

  /** `null` retire l’échéance. */
  @IsOptional()
  @IsDateString()
  dateLimite?: string | null;

  @IsOptional()
  @IsUUID()
  responsableId?: string;
}

export class CommentaireTacheDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  texte!: string;
}

export class QueryTachesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;

  /** mes (à moi), creees (que j’ai confiées), equipe (toutes — encadrement). */
  @IsOptional()
  @IsIn(['mes', 'creees', 'equipe'])
  scope?: string;

  /** Liste séparée par des virgules : a_faire,en_cours. */
  @IsOptional()
  @IsString()
  statut?: string;

  @IsOptional()
  @IsIn(PRIORITES_TACHE)
  priorite?: string;

  @IsOptional()
  @IsIn(['retard', 'aujourdhui', 'semaine', 'sans_date'])
  echeance?: string;

  @IsOptional()
  @IsUUID()
  responsableId?: string;

  @IsOptional()
  @IsIn(TYPES_DOSSIER)
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
