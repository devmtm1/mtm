import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

/** Réponse de l'équipe à un message de contact. */
export class RepondreContactDto {
  @ApiProperty({
    example: 'Bonjour, le titre est bien un titre foncier vérifié…',
  })
  @IsString()
  @Length(2, 4000)
  reponse!: string;
}
