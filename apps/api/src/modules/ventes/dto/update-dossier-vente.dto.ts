import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Compléter un dossier après sa création : terrain, prix, commercial, notes.
 * Le statut a sa propre route (transitions contrôlées).
 */
export class UpdateDossierVenteDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() terrainId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() mandatId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  commercialResponsableId?: string;
  @ApiPropertyOptional({ example: 25000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  prixVente?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
