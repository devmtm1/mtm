import { Transform } from 'class-transformer';
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
import { versBooleen } from '../../../common/utils/booleen.transform';

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
  @Transform(versBooleen)
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

  // --- Mandat de recherche de terrain (formulaire « NS- ») ---
  // Le client décrit ce qu'il cherche, MTM prospecte pour lui. Tout est
  // facultatif : une fiche prospect ordinaire n'ouvre pas de mandat.
  @ApiPropertyOptional({
    description: 'Ouvre un mandat de recherche et lui attribue sa référence',
  })
  @IsOptional()
  @Transform(versBooleen)
  @IsBoolean()
  rechercheActive?: boolean;
  @ApiPropertyOptional({ example: 'en_recherche' })
  @IsOptional()
  @IsString()
  @Length(0, 40)
  rechercheStatut?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 120)
  profession?: string;
  @ApiPropertyOptional({ description: 'Quartier, zone ou repère' })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  quartierRecherche?: string;
  @ApiPropertyOptional({ description: 'Surface minimum acceptable en m²' })
  @IsOptional()
  @IsInt()
  @Min(0)
  surfaceMin?: number;
  @ApiPropertyOptional({ description: 'Surface maximum acceptable en m²' })
  @IsOptional()
  @IsInt()
  @Min(0)
  surfaceMax?: number;
  @ApiPropertyOptional({ description: 'Budget visé, en deçà du plafond' })
  @IsOptional()
  @IsInt()
  @Min(0)
  budgetIdeal?: number;
  @ApiPropertyOptional({
    description: 'Le type de document est-il une condition ferme ?',
  })
  @IsOptional()
  @Transform(versBooleen)
  @IsBoolean()
  documentNonNegociable?: boolean;
  @ApiPropertyOptional({ example: 'indifferent' })
  @IsOptional()
  @IsString()
  @Length(0, 40)
  terrainBorne?: string;
  @ApiPropertyOptional({ example: 'prioritaire' })
  @IsOptional()
  @IsString()
  @Length(0, 40)
  accesVoirie?: string;
  @ApiPropertyOptional({ example: 'oui' })
  @IsOptional()
  @IsString()
  @Length(0, 40)
  proximiteRoutePrincipale?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  constructibiliteUsage?: string;
  @ApiPropertyOptional({ example: 'un_a_trois_mois' })
  @IsOptional()
  @IsString()
  @Length(0, 40)
  delaiSouhaite?: string;
  @ApiPropertyOptional({ example: 'a_confirmer' })
  @IsOptional()
  @IsString()
  @Length(0, 40)
  disponibiliteVisite?: string;
  @ApiPropertyOptional({ example: 'comptant' })
  @IsOptional()
  @IsString()
  @Length(0, 40)
  financement?: string;
  @ApiPropertyOptional({ example: 'indifferent' })
  @IsOptional()
  @IsString()
  @Length(0, 40)
  preferenceVendeurDirect?: string;
  @ApiPropertyOptional({
    description:
      'Le client accepte de recevoir d’autres opportunités que celles qu’il a demandées',
  })
  @IsOptional()
  @Transform(versBooleen)
  @IsBoolean()
  accepteOpportunitesSimilaires?: boolean;

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
