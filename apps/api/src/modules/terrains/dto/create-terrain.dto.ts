import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
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

  // --- Suivi du portefeuille (reprise du tableur historique) ---
  @ApiPropertyOptional({ description: 'Prix de cession (interne, sensible)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  prixCession?: number;
  @ApiPropertyOptional({ description: 'Nombre de lots du bien' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  nombreLots?: number;
  @ApiPropertyOptional({
    description: 'Date d’entrée du bien dans le portefeuille (AAAA-MM-JJ)',
  })
  @IsOptional()
  @IsDateString()
  dateEntree?: string;
  @ApiPropertyOptional({ description: 'Cash, Moratoire… (paramétrable)' })
  @IsOptional()
  @IsString()
  modalitePaiement?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(240)
  dureeMoratoireMois?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  acompteMontant?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notesPaiement?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(versBooleen)
  @IsBoolean()
  produitDirect?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(versBooleen)
  @IsBoolean()
  protocoleAccord?: boolean;
  @ApiPropertyOptional({ description: 'À visiter, Visité… (paramétrable)' })
  @IsOptional()
  @IsString()
  statutVisite?: string;
  @ApiPropertyOptional({ description: 'Mandataire propre à ce bien' })
  @IsOptional()
  @IsString()
  @Length(1, 150)
  contactVendeurNom?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(3, 40)
  contactVendeurTelephone?: string;
  @ApiPropertyOptional({ description: 'Numéro du titre ou de la délibération' })
  @IsOptional()
  @IsString()
  @Length(1, 150)
  referenceDocumentFoncier?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateDocumentFoncier?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  commentaireAdministratif?: string;
}
