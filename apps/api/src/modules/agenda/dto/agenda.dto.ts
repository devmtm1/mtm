import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
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
import { versBooleen } from '../../../common/utils/booleen.transform';
import { TYPES_DOSSIER } from '../../dossiers/dossier-lien.service';
import {
  STATUTS_EVENEMENT,
  TYPES_EVENEMENT,
  VISIBILITES_EVENEMENT,
} from '../agenda.constants';

export class CreateEvenementDto {
  @IsIn(TYPES_EVENEMENT)
  type!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  titre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  lieu?: string;

  @IsDateString()
  debut!: string;

  @IsOptional()
  @IsDateString()
  fin?: string;

  @IsOptional()
  @Transform(versBooleen)
  @IsBoolean()
  journeeEntiere?: boolean;

  @IsOptional()
  @IsIn(VISIBILITES_EVENEMENT)
  visibilite?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsUUID('all', { each: true })
  participantIds?: string[];

  @IsOptional()
  @IsIn(TYPES_DOSSIER)
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  /** Rappel envoyé aux participants N minutes avant (au plus une semaine). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10080)
  rappelMinutes?: number;
}

export class UpdateEvenementDto {
  @IsOptional()
  @IsIn(TYPES_EVENEMENT)
  type?: string;

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
  @IsString()
  @MaxLength(200)
  lieu?: string;

  @IsOptional()
  @IsDateString()
  debut?: string;

  /** `null` retire l’heure de fin. */
  @IsOptional()
  @IsDateString()
  fin?: string | null;

  @IsOptional()
  @Transform(versBooleen)
  @IsBoolean()
  journeeEntiere?: boolean;

  @IsOptional()
  @IsIn(STATUTS_EVENEMENT)
  statut?: string;

  @IsOptional()
  @IsIn(VISIBILITES_EVENEMENT)
  visibilite?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsUUID('all', { each: true })
  participantIds?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10080)
  rappelMinutes?: number | null;
}

export class QueryAgendaDto {
  @IsDateString()
  du!: string;

  @IsDateString()
  au!: string;

  /** moi : mon agenda ; equipe : l’agenda partagé. */
  @IsOptional()
  @IsIn(['moi', 'equipe'])
  scope?: string;
}
