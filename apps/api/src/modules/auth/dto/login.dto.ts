import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@mtm-immobilier.sn' })
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  email!: string;

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
