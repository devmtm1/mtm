import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

/**
 * Mot de passe initial d'un compte d'espace client (propriétaire, locataire).
 * Même politique que les comptes internes : le titulaire le remplace à la
 * première connexion.
 */
export class CreateClientAccountDto {
  @ApiProperty({ example: 'MotDePasseClient123!' })
  @IsString()
  @Length(12, 200)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
  password!: string;
}
