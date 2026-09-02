import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class CreateActiviteCrmDto {
  @ApiProperty() @IsString() @Length(1, 80) type!: string;
  @ApiProperty() @IsString() @Length(1, 200) titre!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateEcheance?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateRealisation?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 40)
  statut?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 40)
  priorite?: string;
}
