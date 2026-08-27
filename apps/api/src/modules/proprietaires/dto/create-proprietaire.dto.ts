import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class CreateProprietaireDto {
  @ApiProperty({ example: 'Aminata' })
  @IsString()
  @Length(1, 100)
  firstName!: string;

  @ApiProperty({ example: 'Ndiaye' })
  @IsString()
  @Length(1, 100)
  lastName!: string;

  @ApiPropertyOptional({ example: 'aminata.ndiaye@email.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  email?: string | null;

  @ApiPropertyOptional({ example: '77 12 34 56 7' })
  @IsOptional()
  @IsString()
  @Length(1, 30)
  phone?: string | null;

  @ApiPropertyOptional({ example: 'Propriétaire du lot 12' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string | null;
}
