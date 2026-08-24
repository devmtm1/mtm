import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class DisableTwoFactorDto {
  @ApiProperty({ description: 'Mot de passe actuel, requis pour confirmer' })
  @IsString()
  @Length(1, 200)
  currentPassword!: string;
}
