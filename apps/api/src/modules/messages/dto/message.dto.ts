import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { versBooleen } from '../../../common/utils/booleen.transform';

export class CreateMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  corps!: string;

  /** Vrai : le client le lit dans son espace. Faux (défaut) : note interne. */
  @IsOptional()
  @Transform(versBooleen)
  @IsBoolean()
  visibleClient?: boolean;
}

export class CreateMessageClientDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  corps!: string;
}
