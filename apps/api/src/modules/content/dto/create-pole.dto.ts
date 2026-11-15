import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { versBooleen } from '../../../common/utils/booleen.transform';

export class CreatePoleDto {
  @ApiProperty({ example: 'MTM Clean' })
  @IsString()
  @Length(2, 120)
  nom!: string;

  @ApiPropertyOptional({ example: 'Nettoyage et entretien' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  accroche?: string;

  @ApiPropertyOptional({
    description: 'Phrase courte affichée sur les cartes de l’accueil',
  })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @ApiPropertyOptional({
    description: 'Les prestations, une par puce',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  points?: string[];

  @ApiPropertyOptional({
    example: '/contact?sujet=MTM%20Clean',
    description: 'Chemin du site ou adresse https complète',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^(\/(?!\/)|https:\/\/)/, {
    message:
      'Le lien doit être un chemin du site (/contact) ou une adresse https://',
  })
  lienUrl?: string;

  @ApiPropertyOptional({ example: 'Demander un devis' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  libelleLien?: string;

  @ApiPropertyOptional({
    description: 'Montré parmi les services de l’accueil du site',
  })
  @IsOptional()
  @Transform(versBooleen)
  @IsBoolean()
  surAccueil?: boolean;

  @ApiPropertyOptional({
    description: 'Identifiants des pôles proposés en complément',
    type: [String],
    example: ['clean', 'maintenance'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @Matches(/^[a-z0-9-]{1,60}$/, { each: true })
  lies?: string[];

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  ordre?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(versBooleen)
  @IsBoolean()
  isActive?: boolean;
}
