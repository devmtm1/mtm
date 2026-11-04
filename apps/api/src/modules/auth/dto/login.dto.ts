import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  ValidateIf,
} from 'class-validator';

export class LoginDto {
  @ApiPropertyOptional({
    description:
      'Adresse e-mail ou numéro de téléphone (compte client ouvert sans e-mail)',
    example: '77 123 45 67',
  })
  @ValidateIf((dto: LoginDto) => !dto.email)
  @IsString({ message: 'Identifiant invalide' })
  @Length(3, 254, { message: 'Identifiant invalide' })
  identifiant?: string;

  @ApiPropertyOptional({
    example: 'admin@mtm-immobilier.sn',
    description:
      'Ancien nom du champ : équivaut à « identifiant » avec une adresse e-mail',
  })
  @ValidateIf((dto: LoginDto) => !dto.identifiant)
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  email?: string;

  @ApiProperty({ example: 'MotDePasseSecurise123!' })
  @IsString()
  @Length(1, 200)
  password!: string;

  @ApiProperty({
    required: false,
    description: 'Code TOTP à 6 chiffres, requis si le 2FA est activé',
    example: '123456',
  })
  @IsOptional()
  @IsString()
  @Length(6, 6)
  twoFactorCode?: string;
}
