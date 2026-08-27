import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateTerrainDto {
  @ApiProperty() @IsString() @Length(1, 100) referenceInterne!: string;
  @ApiProperty() @IsString() @Length(1, 200) nom!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 150)
  parcelleMatricule?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() proprietaireId?: string;
  @ApiProperty() @IsString() statutJuridique!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() typeDocumentFoncier?: string;
  @ApiProperty() @IsString() niveauVerification!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() region?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() commune?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() localisationDetail?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) superficie?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() uniteSuperficie?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() dimensions?: Record<
    string,
    unknown
  >;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  prixAcquisition?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) prixPublic?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() marge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) commission?: number;
  @ApiProperty() @IsString() statutCommercial!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() accesRoutier?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() eauDisponible?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  electriciteDisponible?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() voisinage?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() proximiteAxes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notesInternes?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  commercialResponsableId?: string;
}
