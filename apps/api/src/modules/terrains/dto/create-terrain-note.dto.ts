import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class CreateTerrainNoteDto {
  @ApiProperty({
    description: 'Appel passé, visite faite, relance du vendeur…',
  })
  @IsString()
  @Length(1, 2000)
  texte!: string;
}
