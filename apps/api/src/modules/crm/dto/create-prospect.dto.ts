import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

/**
 * Fiche prospect de MTM (fiche de suivi « client potentiel »). Seuls le nom
 * et le commercial responsable sont indispensables à la création : le reste
 * se remplit au fil des échanges.
 */
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
  @ApiPropertyOptional({ description: 'Ce numéro est joignable sur WhatsApp' })
  @IsOptional()
  @IsBoolean()
  whatsapp?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 120)
  villeResidence?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 120)
  paysResidence?: string;
  @ApiPropertyOptional({ example: 'facebook' })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  sourceAcquisition?: string;
  @ApiPropertyOptional({ example: 'fort' })
  @IsOptional()
  @IsString()
  @Length(0, 40)
  niveauInteret?: string;

  // --- Qualification du besoin ---
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  besoins?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 200)
  zoneRecherchee?: string;
  @ApiPropertyOptional({ description: 'Surface souhaitée en m²' })
  @IsOptional()
  @IsInt()
  @Min(0)
  surfaceSouhaitee?: number;
  @ApiPropertyOptional({ example: 'Titre foncier' })
  @IsOptional()
  @IsString()
  @Length(0, 60)
  typeDocumentSouhaite?: string;
  @ApiPropertyOptional({ example: 'habitation' })
  @IsOptional()
  @IsString()
  @Length(0, 40)
  objectifAchat?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) budgetMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) budgetMax?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  preferences?: string;

  // --- Premier contact ---
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  premierContactLe?: string;
  @ApiPropertyOptional({ example: 'appel' })
  @IsOptional()
  @IsString()
  @Length(0, 40)
  premierContactMoyen?: string;

  // --- Suivi ---
  @ApiPropertyOptional({ description: 'Prochaine action prévue' })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  prochaineAction?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  prochaineRelanceLe?: string;

  // --- Négociation ---
  @ApiPropertyOptional() @IsOptional() @IsUUID() terrainChoisiId?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) offreClient?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) prixNegocie?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  commentaireNegociation?: string;

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
