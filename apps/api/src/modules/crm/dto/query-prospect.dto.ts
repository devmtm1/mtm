import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class QueryProspectDto {
  /** Nom, prénom, téléphone, e-mail ou référence du prospect. */
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsUUID() commercialResponsableId?: string;
  @IsOptional() @IsString() statutPipeline?: string;
  @IsOptional() @IsString() sourceAcquisition?: string;
  @IsOptional() @IsString() zoneRecherchee?: string;
  @IsOptional() @IsString() niveauInteret?: string;
  /** Vues rapides du commercial : à relancer aujourd'hui, en retard, visites à venir… */
  @IsOptional()
  @IsIn([
    'a_relancer',
    'relance_en_retard',
    'sans_action',
    'visites_a_venir',
    'retours_a_saisir',
    'actifs',
  ])
  vue?: string;
  @IsOptional() @IsDateString() dateMin?: string;
  @IsOptional() @IsDateString() dateMax?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) pageSize = 25;
  @IsOptional()
  @IsIn(['createdAt', 'nom', 'statutPipeline', 'score', 'prochaineRelanceLe'])
  sortBy = 'createdAt';
  @IsOptional() @IsIn(['asc', 'desc']) sortOrder: 'asc' | 'desc' = 'desc';
}
