import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { GED_ORIGINES, type GedOrigine } from '../ged.service';

export class QueryGedDto {
  /** Texte cherché dans le titre, le type et la référence de l'objet porteur. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  /** Origines, séparées par des virgules : `terrain,vente`. */
  @IsOptional()
  @Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) => {
    const brut = obj[key];
    if (Array.isArray(brut)) return brut.map(String);
    return typeof brut === 'string' && brut ? brut.split(',') : undefined;
  })
  @IsArray()
  @IsIn(GED_ORIGINES, { each: true })
  origines?: GedOrigine[];

  @IsOptional()
  @IsString()
  @MaxLength(60)
  type?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  depuis?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  jusqua?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 25;
}
