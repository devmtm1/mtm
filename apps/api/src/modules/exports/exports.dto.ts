import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** Les listes du back-office exportables, et la ressource dont on exige le droit « exporter ». */
export const MODULES_EXPORTABLES = {
  terrains: 'terrains',
  programmes: 'terrains',
  mandats: 'mandats',
  crm: 'crm',
  proprietaires: 'proprietaires',
  ventes: 'ventes',
  demarches: 'demarches',
  locatif: 'locatif',
  construction: 'construction',
  finances: 'finances',
  contacts: 'contact',
  users: 'users',
  taches: 'taches',
  documents: 'terrains',
} as const;

export type ModuleExportable = keyof typeof MODULES_EXPORTABLES;

export const TYPES_COLONNE_EXPORT = [
  'texte',
  'nombre',
  'montant',
  'date',
  'pourcentage',
] as const;

export class ColonneExportDto {
  @IsString() @MinLength(1) @MaxLength(60) cle!: string;
  @IsString() @MinLength(1) @MaxLength(120) libelle!: string;
  @IsIn(TYPES_COLONNE_EXPORT) type!: (typeof TYPES_COLONNE_EXPORT)[number];
}

/**
 * Export d'une liste telle qu'elle est affichée au back-office (filtres et tri compris) : l'écran envoie ses
 * colonnes et ses lignes, le serveur en fait un classeur Excel ou un PDF à l'en-tête de la société, et trace
 * l'export dans le journal d'audit.
 */
export class ExportTableauDto {
  @IsIn(Object.keys(MODULES_EXPORTABLES)) module!: ModuleExportable;
  @IsString() @MinLength(2) @MaxLength(120) titre!: string;
  @IsOptional() @IsString() @MaxLength(300) sousTitre?: string;
  @IsIn(['xlsx', 'pdf']) format!: 'xlsx' | 'pdf';
  @IsString() @MinLength(3) @MaxLength(300) justification!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => ColonneExportDto)
  colonnes!: ColonneExportDto[];

  @IsArray()
  @ArrayMaxSize(5000)
  @IsObject({ each: true })
  // Sans cela, la conversion implicite du ValidationPipe transforme chaque ligne en tableau vide.
  @Type(() => Object)
  lignes!: Array<Record<string, unknown>>;
}
