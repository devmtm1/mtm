import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  ETATS_MATERIEL,
  ROLES_FICHIER,
  STATUTS_MATERIEL,
  TYPES_ENTRETIEN,
  TYPES_SORTIE,
} from '../materiel.regles';

export class CreateMaterielDto {
  @ApiPropertyOptional({
    description:
      'Numéro de l’autocollant déjà collé (3 pour « MTM 0003 »). Vide : le numéro suivant est attribué.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(999999)
  numero?: number;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  designation!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  categorie!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  marque?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  modele?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  numeroSerie?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateAchat?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  prixAchat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fournisseur?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  garantieJusqua?: Date;

  @ApiPropertyOptional({ enum: ETATS_MATERIEL })
  @IsOptional()
  @IsIn(ETATS_MATERIEL)
  etat?: (typeof ETATS_MATERIEL)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lieu?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateMaterielDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  designation?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  categorie?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  marque?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  modele?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  numeroSerie?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateAchat?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  prixAchat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fournisseur?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  garantieJusqua?: Date;

  @ApiPropertyOptional({ enum: ETATS_MATERIEL })
  @IsOptional()
  @IsIn(ETATS_MATERIEL)
  etat?: (typeof ETATS_MATERIEL)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lieu?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class AffecterMaterielDto {
  @ApiPropertyOptional({ description: 'Un collaborateur…' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: '…ou un chantier…' })
  @IsOptional()
  @IsUUID()
  projetId?: string;

  @ApiPropertyOptional({
    description: '…ou un nom libre (prestataire, visiteur).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class RetourMaterielDto {
  @ApiPropertyOptional({ enum: ETATS_MATERIEL })
  @IsOptional()
  @IsIn(ETATS_MATERIEL)
  etat?: (typeof ETATS_MATERIEL)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lieu?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class SortieMaterielDto {
  @ApiProperty({ enum: TYPES_SORTIE })
  @IsIn(TYPES_SORTIE)
  type!: (typeof TYPES_SORTIE)[number];

  @ApiProperty({ description: 'Motif obligatoire.' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  motif!: string;
}

export class CreateEntretienDto {
  @ApiProperty({ enum: TYPES_ENTRETIEN })
  @IsIn(TYPES_ENTRETIEN)
  type!: (typeof TYPES_ENTRETIEN)[number];

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  description!: string;

  @ApiProperty({
    description: 'Date prévue, ou date de réalisation si `fait`.',
  })
  @Type(() => Date)
  @IsDate()
  date!: Date;

  @ApiPropertyOptional({
    description: 'Déjà réalisé : enregistre directement le passage.',
  })
  @IsOptional()
  @IsBoolean()
  fait?: boolean;

  @ApiPropertyOptional({
    description: 'L’objet est immobilisé pendant l’intervention.',
  })
  @IsOptional()
  @IsBoolean()
  immobilise?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cout?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  prestataire?: string;
}

export class TerminerEntretienDto {
  @ApiPropertyOptional({
    description: 'Date de réalisation (aujourd’hui par défaut).',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cout?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  prestataire?: string;

  @ApiPropertyOptional({
    enum: ETATS_MATERIEL,
    description: 'État de l’objet après l’intervention.',
  })
  @IsOptional()
  @IsIn(ETATS_MATERIEL)
  etat?: (typeof ETATS_MATERIEL)[number];
}

export class DeposerFichierMaterielDto {
  @ApiProperty({ enum: ROLES_FICHIER })
  @IsIn(ROLES_FICHIER)
  role!: (typeof ROLES_FICHIER)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}

export class ListerMaterielDto {
  @ApiPropertyOptional({
    description:
      'Numéro de l’autocollant, désignation, marque, modèle ou numéro de série.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() categorie?: string;

  @ApiPropertyOptional({ enum: STATUTS_MATERIEL })
  @IsOptional()
  @IsIn(STATUTS_MATERIEL)
  statut?: (typeof STATUTS_MATERIEL)[number];

  @ApiPropertyOptional({ enum: ETATS_MATERIEL })
  @IsOptional()
  @IsIn(ETATS_MATERIEL)
  etat?: (typeof ETATS_MATERIEL)[number];

  @ApiPropertyOptional() @IsOptional() @IsString() lieu?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() affecteAId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projetId?: string;

  @ApiPropertyOptional({
    enum: ['entretien_a_prevoir', 'garantie_proche', 'sans_lieu'],
    description: 'Filtre d’un indicateur du tableau de bord.',
  })
  @IsOptional()
  @IsIn(['entretien_a_prevoir', 'garantie_proche', 'sans_lieu'])
  filtre?: 'entretien_a_prevoir' | 'garantie_proche' | 'sans_lieu';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class CreateInventaireDto {
  @ApiProperty({ description: 'Le lieu parcouru.' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lieu!: string;
}

export class AjouterNumeroInventaireDto {
  @ApiProperty({
    description:
      'Le numéro lu sur l’autocollant : « 3 », « 0003 » ou « MTM 0003 ».',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  numero!: string;
}

export class TerminerInventaireDto {
  @ApiPropertyOptional({
    description:
      'Mettre à jour le lieu des objets trouvés ailleurs que dans leur fiche.',
  })
  @IsOptional()
  @IsBoolean()
  mettreAJourLieux?: boolean;
}
