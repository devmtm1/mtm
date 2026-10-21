import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { versBooleen } from '../../../common/utils/booleen.transform';

/** Les rubriques de la page « Actualités et conseils ». */
export const CATEGORIES_PUBLICATION = [
  'conseil',
  'actualite',
  'foncier',
  'construction',
  'autre',
] as const;

export type CategoriePublication = (typeof CATEGORIES_PUBLICATION)[number];

export class CreatePublicationDto {
  @ApiProperty({ example: 'Comment vérifier un titre foncier avant d’acheter' })
  @IsString()
  @Length(2, 160)
  titre!: string;

  @ApiPropertyOptional({ enum: CATEGORIES_PUBLICATION, default: 'conseil' })
  @IsOptional()
  @IsIn(CATEGORIES_PUBLICATION)
  categorie?: CategoriePublication;

  @ApiPropertyOptional({
    example: 'Les trois documents à demander et les erreurs à éviter.',
  })
  @IsOptional()
  @IsString()
  @Length(0, 600)
  resume?: string;

  @ApiPropertyOptional({
    description:
      'Jour affiché sur le site ; une date à venir programme la mise en ligne',
  })
  @IsOptional()
  @IsDateString()
  datePublication?: string | null;

  @ApiPropertyOptional({
    example: 'https://www.youtube.com/watch?v=LSH6GRjVwho',
    description:
      'Lien d’une vidéo YouTube, à la place d’un fichier ; une chaîne vide retire la vidéo YouTube',
  })
  @IsOptional()
  @IsString()
  @Length(0, 300)
  youtubeUrl?: string | null;

  @ApiPropertyOptional({ description: 'Vidéo à la une (une seule à la fois)' })
  @IsOptional()
  @Transform(versBooleen)
  @IsBoolean()
  misEnAvant?: boolean;
}

export class UpdatePublicationDto extends PartialType(CreatePublicationDto) {}

/** La vidéo est déjà chez Cloudinary : on dit à l'API laquelle, elle la vérifie. */
export class AttacherVideoDto {
  @ApiProperty({
    description: 'Identifiant public Cloudinary renvoyé par l’envoi',
  })
  @IsString()
  @Length(5, 300)
  @Matches(/^[A-Za-z0-9_\-./]+$/, { message: 'Identifiant de vidéo invalide' })
  publicId!: string;
}
