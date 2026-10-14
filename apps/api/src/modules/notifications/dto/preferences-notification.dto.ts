import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { versBooleen } from '../../../common/utils/booleen.transform';

export class PreferencesNotificationDto {
  @IsOptional()
  @Transform(versBooleen)
  @IsBoolean()
  email?: boolean;

  @IsOptional()
  @Transform(versBooleen)
  @IsBoolean()
  sms?: boolean;

  @IsOptional()
  @Transform(versBooleen)
  @IsBoolean()
  whatsapp?: boolean;

  /** Numéro au format international, ex. +221 77 123 45 67 ; chaîne vide pour l’effacer. */
  @IsOptional()
  @IsString()
  @MaxLength(25)
  @Matches(/^(\+?[0-9][0-9 ]{7,20})?$/, {
    message:
      'Numéro invalide : utilisez le format international, ex. +221 77 123 45 67',
  })
  telephone?: string;
}
