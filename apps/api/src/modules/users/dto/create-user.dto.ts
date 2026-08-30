import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsUUID, IsString, Length, Matches } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'commercial@mtm-immobilier.sn' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'MotDePasseSecurise123!' })
  @IsString()
  @Length(12, 200, {
    message: 'Le mot de passe doit contenir au moins 12 caractères',
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message:
      'Le mot de passe doit contenir une majuscule, une minuscule, un chiffre et un caractère spécial',
  })
  password!: string;

  @ApiProperty({ example: 'Fatou' })
  @IsString()
  @Length(1, 100)
  firstName!: string;

  @ApiProperty({ example: 'Diop' })
  @IsString()
  @Length(1, 100)
  lastName!: string;

  @ApiProperty({ example: '8d7c6b5a-4e3f-2d1c-8b9a-887766554433' })
  @IsUUID()
  roleId!: string;
}
