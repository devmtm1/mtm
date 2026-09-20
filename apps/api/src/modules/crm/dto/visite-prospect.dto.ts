import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

/**
 * Terrain proposé à un prospect : le rendez-vous de visite et le retour du
 * client vivent sur le même objet, comme sur la fiche papier.
 */
export class CreateVisiteProspectDto {
  @ApiProperty() @IsUUID() terrainId!: string;

  // --- Rendez-vous ---
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateProposee?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateConfirmee?: string;
  @ApiPropertyOptional({ example: '10:30' })
  @IsOptional()
  @IsString()
  @Length(0, 20)
  heure?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 200)
  lieuRendezVous?: string;
  @ApiPropertyOptional({ description: 'Frais de visite en FCFA' })
  @IsOptional()
  @IsInt()
  @Min(0)
  fraisVisite?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() fraisPayes?: boolean;
  @ApiPropertyOptional({ description: 'Commercial qui accompagne la visite' })
  @IsOptional()
  @IsUUID()
  accompagnateurId?: string;
  @ApiPropertyOptional({ example: 'reportee' })
  @IsOptional()
  @IsString()
  @Length(0, 40)
  motifNonEffectuee?: string;
  @ApiPropertyOptional({ example: 'programmee' })
  @IsOptional()
  @IsString()
  @Length(0, 40)
  statut?: string;

  // --- Retour après la visite ---
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateRetour?: string;
  @ApiPropertyOptional({ example: 'oui_hesitation' })
  @IsOptional()
  @IsString()
  @Length(0, 40)
  terrainPlait?: string;
  @ApiPropertyOptional({ example: 'negociation_demandee' })
  @IsOptional()
  @IsString()
  @Length(0, 40)
  prixAccepte?: string;
  @ApiPropertyOptional({ example: 'prix' })
  @IsOptional()
  @IsString()
  @Length(0, 40)
  objectionPrincipale?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  commentaireClient?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  souhaiteAutreTerrain?: boolean;
}

export class UpdateVisiteProspectDto extends PartialType(
  CreateVisiteProspectDto,
) {}
