import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @Length(1, 200)
  currentPassword!: string;

  @ApiProperty({ description: 'Au moins 12 caractères' })
  @IsString()
  @Length(12, 200, {
    message: 'Le nouveau mot de passe doit contenir au moins 12 caractères',
  })
  newPassword!: string;
}
