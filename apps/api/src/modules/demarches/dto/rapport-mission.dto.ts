import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { versBooleen } from '../../../common/utils/booleen.transform';

/** Options de génération du rapport de vérification. */
export class GenererRapportDto {
  /** Joindre l'annexe photographique de la visite (oui par défaut). */
  @IsOptional() @Transform(versBooleen) @IsBoolean() avecPhotos?: boolean;
}
