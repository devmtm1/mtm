import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { TerrainPointInteretDto } from './terrain-point-interet.dto';
import { versBooleen } from '../../../common/utils/booleen.transform';

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
  @ApiPropertyOptional({
    description: 'Nature du bien : terrain, villa, appartement…',
    example: 'villa',
  })
  @IsOptional()
  @IsString()
  typeBien?: string;
  @ApiPropertyOptional({ description: 'Surface de la parcelle' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  superficie?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() uniteSuperficie?: string;
  // --- Caractéristiques du bâti ---
  // Refusées par le service sur un terrain nu : une parcelle vide n'a ni
  // pièces ni surface habitable.
  @ApiPropertyOptional({
    description: 'Surface habitable, distincte de la parcelle',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  surfaceHabitable?: number;
  @ApiPropertyOptional({ example: 'F3' })
  @IsOptional()
  @IsString()
  nombrePieces?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  nombreChambres?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  nombreSallesEau?: number;
  @ApiPropertyOptional({ description: 'Niveaux, rez-de-chaussée compris' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  niveaux?: number;
  @ApiPropertyOptional({ example: 2019 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2200)
  anneeConstruction?: number;
  @ApiPropertyOptional({ example: 'bon_etat' })
  @IsOptional()
  @IsString()
  etatBien?: string;
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
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(versBooleen)
  @IsBoolean()
  misEnAvant?: boolean;
  @ApiPropertyOptional({
    description: 'Descriptif commercial affiché sur la fiche publique',
  })
  @IsOptional()
  @IsString()
  @Length(0, 5000)
  description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() accesRoutier?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(versBooleen)
  @IsBoolean()
  eauDisponible?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  electriciteDisponible?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() voisinage?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() proximiteAxes?: string;
  @ApiPropertyOptional({ type: [TerrainPointInteretDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => TerrainPointInteretDto)
  pointsInteret?: TerrainPointInteretDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() notesInternes?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  commercialResponsableId?: string;
}
