import { Type, Transform } from 'class-transformer';
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
  Min,
} from 'class-validator';
import { versBooleen } from '../../../common/utils/booleen.transform';

export class QueryTerrainDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() statutJuridique?: string;
  @IsOptional() @IsString() niveauVerification?: string;
  @IsOptional() @IsString() statutCommercial?: string;
  /**
   * Catalogue public : `disponible` (défaut) liste les biens à vendre ; `vendu`
   * les références vendues que MTM a choisi d'afficher ; `tous` les deux, les
   * biens à vendre d'abord, puis les références vendues.
   */
  @IsOptional()
  @IsIn(['disponible', 'vendu', 'tous'])
  statut?: 'disponible' | 'vendu' | 'tous';
  @IsOptional() @Transform(versBooleen) @IsBoolean() misEnAvant?: boolean;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() commune?: string;
  @IsOptional() @IsString() vocation?: string;
  /**
   * Nature du bien. À ne pas confondre avec `vocation`, qui dit l'usage du
   * sol (habitation, commerce, agricole) et non ce qui est vendu.
   */
  @IsOptional() @IsString() typeBien?: string;
  /** Typologie d'un bien bâti : F1, F2… */
  @IsOptional() @IsString() nombrePieces?: string;
  @IsOptional() @IsUUID() proprietaireId?: string;
  /**
   * Liste de gestion : `actifs` (défaut) masque les biens archivés, `archives`
   * ne montre qu'eux, `tous` les mêle. Sans effet sur le catalogue public, qui
   * n'affiche jamais un bien archivé.
   */
  @IsOptional()
  @IsIn(['actifs', 'archives', 'tous'])
  archivage?: 'actifs' | 'archives' | 'tous';
  @IsOptional() @IsString() modalitePaiement?: string;
  @IsOptional() @IsString() statutVisite?: string;
  @IsOptional() @Transform(versBooleen) @IsBoolean() produitDirect?: boolean;
  @IsOptional() @Transform(versBooleen) @IsBoolean() protocoleAccord?: boolean;
  @IsOptional() @IsDateString() dateEntreeMin?: string;
  @IsOptional() @IsDateString() dateEntreeMax?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) superficieMin?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) superficieMax?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) prixPublicMin?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) prixPublicMax?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) pageSize = 25;
  @IsOptional()
  @IsString()
  @IsIn([
    'createdAt',
    'referenceInterne',
    'nom',
    'superficie',
    'surfaceHabitable',
    'prixPublic',
    'prixCession',
    'dateEntree',
    'nombreLots',
  ])
  sortBy = 'createdAt';
  @IsOptional() @IsIn(['asc', 'desc']) sortOrder: 'asc' | 'desc' = 'desc';
}
