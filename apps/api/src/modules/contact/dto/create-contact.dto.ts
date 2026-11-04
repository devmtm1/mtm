import { EstTelephone } from '../../../common/validators/est-telephone';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateIf,
} from 'class-validator';

export class CreateContactDto {
  @ApiProperty({ example: 'Fatou Diop' })
  @IsString()
  @Length(2, 200)
  nom!: string;

  @ApiProperty({ example: 'fatou@example.com', required: false })
  /** Une adresse e-mail ou un numéro de téléphone : au moins l'un des deux. */
  @ValidateIf(
    (o: { email?: string; telephone?: string }) =>
      o.email !== undefined || !o.telephone,
  )
  @IsEmail(
    {},
    { message: 'Indiquez une adresse e-mail ou un numéro de téléphone' },
  )
  email?: string;

  @ApiProperty({ example: '+221 77 000 00 00', required: false })
  @IsOptional()
  @IsString()
  @Length(4, 30)
  @EstTelephone()
  telephone?: string;

  @ApiProperty({
    example: 'Acquérir un terrain',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  sujet?: string;

  @ApiProperty({ example: 'Je suis intéressé(e) par le terrain MTM-TH-024...' })
  @IsString()
  @Length(10, 2000)
  message!: string;

  @ApiProperty({ example: 'a1b2c3d4-...', required: false })
  @IsOptional()
  @IsUUID()
  terrainId?: string;

  /** Annonce de location d'où vient la demande (site public). */
  @ApiProperty({ example: 'a1b2c3d4-...', required: false })
  @IsOptional()
  @IsUUID()
  bienLocatifId?: string;
}
