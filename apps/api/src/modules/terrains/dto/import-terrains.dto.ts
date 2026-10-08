import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';
import { versBooleen } from '../../../common/utils/booleen.transform';

/** Champs texte accompagnant le fichier déposé (formulaire multipart). */
export class ImportTerrainsDto {
  @ApiPropertyOptional({
    description: 'Onglet du classeur à lire (le premier par défaut)',
  })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  feuille?: string;

  @ApiPropertyOptional({
    description: 'Onglet ARCHIVES : les biens sont repris archivés',
  })
  @IsOptional()
  @Transform(versBooleen)
  @IsBoolean()
  archives?: boolean;

  @ApiPropertyOptional({
    description:
      'Publier sur le site les biens « Disponible » (sinon tout est repris en Brouillon)',
  })
  @IsOptional()
  @Transform(versBooleen)
  @IsBoolean()
  publierDisponibles?: boolean;
}
