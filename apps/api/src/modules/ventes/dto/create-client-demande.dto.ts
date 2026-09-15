import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export const CLIENT_DEMANDE_TYPES = [
  'information',
  'visite',
  'reservation',
] as const;
export type ClientDemandeType = (typeof CLIENT_DEMANDE_TYPES)[number];

/**
 * Demande déposée depuis l'espace client par un client connecté : l'identité
 * (nom, e-mail, téléphone) vient de son compte, jamais du formulaire.
 */
export class CreateClientDemandeDto {
  @ApiProperty({ enum: CLIENT_DEMANDE_TYPES })
  @IsIn(CLIENT_DEMANDE_TYPES)
  type!: ClientDemandeType;

  @ApiProperty({ example: 'Je souhaite visiter ce terrain samedi matin.' })
  @IsString()
  @Length(10, 2000)
  message!: string;

  @ApiPropertyOptional({
    description: 'Terrain concerné (obligatoire pour une réservation)',
  })
  @IsOptional()
  @IsUUID()
  terrainId?: string;

  @ApiPropertyOptional({ example: 'Question sur le bornage' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  sujet?: string;
}
