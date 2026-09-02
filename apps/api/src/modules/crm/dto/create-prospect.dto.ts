import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

export class CreateProspectDto {
  @ApiProperty() @IsString() @Length(1, 120) nom!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 120)
  prenom?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @Length(0, 200)
  email?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 40)
  telephone?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 120)
  paysResidence?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 200)
  sourceAcquisition?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  besoins?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) budgetMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) budgetMax?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  preferences?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  commercialResponsableId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 60)
  statutPipeline?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) score?: number;
}
