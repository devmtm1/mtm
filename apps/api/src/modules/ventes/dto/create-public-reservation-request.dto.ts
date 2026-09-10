import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreatePublicReservationRequestDto {
  @ApiProperty()
  @IsUUID()
  terrainId!: string;

  @ApiProperty({ example: 'Fatou Diop' })
  @IsString()
  @Length(2, 200)
  nom!: string;

  @ApiProperty({ example: 'fatou@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(4, 30)
  telephone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  message?: string;
}
