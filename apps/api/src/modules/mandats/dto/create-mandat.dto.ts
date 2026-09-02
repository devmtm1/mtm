import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsObject,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateMandatDto {
  @ApiProperty() @IsString() @Length(1, 100) referenceInterne!: string;
  @ApiProperty() @IsUUID() proprietaireId!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  commercialResponsableId?: string;
  @ApiProperty() @IsString() typeMandat!: string;
  @ApiProperty() @IsDateString() dateDebut!: string;
  @ApiProperty() @IsDateString() dateFin!: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() exclusivite?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  prixConditions?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  commissions?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  clauses?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  restrictionsContractuelles?: Record<string, unknown>;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  objectifsCommercialisation?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  alerteEcheanceJours?: number;
  @ApiProperty() @IsString() statut!: string;
}
