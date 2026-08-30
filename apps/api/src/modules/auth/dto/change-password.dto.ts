import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @Length(1, 200)
  currentPassword!: string;

  @ApiProperty({
    description:
      'Au moins 12 caractères avec majuscule, minuscule, chiffre et caractère spécial',
  })
  @IsString()
  @Length(12, 200, {
    message: 'Le nouveau mot de passe doit contenir au moins 12 caractères',
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message:
      'Le nouveau mot de passe doit contenir une majuscule, une minuscule, un chiffre et un caractère spécial',
  })
  newPassword!: string;
}
