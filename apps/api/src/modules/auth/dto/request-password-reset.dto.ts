import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, Length, ValidateIf } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiPropertyOptional({
    description: 'Adresse e-mail ou numéro de téléphone du compte',
    example: 'utilisateur@mtm-immobilier.sn',
  })
  @ValidateIf((dto: RequestPasswordResetDto) => !dto.email)
  @IsString({ message: 'Identifiant invalide' })
  @Length(3, 254, { message: 'Identifiant invalide' })
  identifiant?: string;

  @ApiPropertyOptional({ description: 'Ancien nom du champ' })
  @ValidateIf((dto: RequestPasswordResetDto) => !dto.identifiant)
  @IsEmail()
  email?: string;
}
