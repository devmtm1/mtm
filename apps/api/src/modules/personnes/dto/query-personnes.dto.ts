import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { FILTRES_PERSONNES, type FiltrePersonnes } from '../regroupement';

export class QueryPersonnesDto {
  /** Nom, téléphone, e-mail ou référence. */
  @IsOptional() @IsString() search?: string;
  /** Un rôle, ou les doublons à vérifier : les compteurs, eux, portent toujours sur toute la recherche. */
  @IsOptional()
  @IsIn([...FILTRES_PERSONNES])
  filtre: FiltrePersonnes = 'tous';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;
}
