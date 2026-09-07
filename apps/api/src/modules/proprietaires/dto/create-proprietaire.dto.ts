import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

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
  @Transform(emptyToUndefined)
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  email?: string | null;

  @ApiPropertyOptional({ example: '77 12 34 56 7' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Length(1, 30)
  phone?: string | null;

  @ApiPropertyOptional({ example: 'Propriétaire du lot 12' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Length(0, 500)
  notes?: string | null;
}
