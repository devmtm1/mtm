import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreateSettingDto {
  @ApiProperty({ example: 'commission.taux_defaut' })
  @IsString()
  @Length(2, 100)
  @Matches(/^[a-z0-9_.]+$/, {
    message:
      'La clé doit être en minuscules, chiffres, underscores et points uniquement',
  })
  key!: string;

  @ApiProperty({
    description: 'Valeur JSON quelconque (string, nombre, objet...)',
    example: 5,
  })
  @IsNotEmpty()
  value!: unknown;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @ApiProperty({
    required: false,
    default: false,
    description:
      'Si vrai, requiert la permission settings:administrer (et non settings:modifier) pour être modifié ou consulté en clair',
  })
  @IsOptional()
  @IsBoolean()
  isSensitive?: boolean;
}
