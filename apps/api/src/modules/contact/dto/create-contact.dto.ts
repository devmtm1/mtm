import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class CreateContactDto {
  @ApiProperty({ example: 'Fatou Diop' })
  @IsString()
  @Length(2, 200)
  nom!: string;

  @ApiProperty({ example: 'fatou@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '+221 77 000 00 00', required: false })
  @IsOptional()
  @IsString()
  @Length(4, 30)
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
  @IsString()
  terrainId?: string;
}
