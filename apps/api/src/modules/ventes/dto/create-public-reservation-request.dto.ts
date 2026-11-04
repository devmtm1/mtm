import { EstTelephone } from '../../../common/validators/est-telephone';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateIf,
} from 'class-validator';

export class CreatePublicReservationRequestDto {
  @ApiProperty()
  @IsUUID()
  terrainId!: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(4, 30)
  @EstTelephone()
  telephone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  message?: string;
}
