import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Identité de l'entreprise imprimée sur les documents. Un champ envoyé vide
 * est effacé (le document retombe alors sur la valeur du site, ou n'affiche
 * rien) ; un champ absent n'est pas touché.
 */
export class ProfilEntrepriseDto {
  /** Dénomination légale (« Momar Talla Mbaye Global Service »). */
  @IsOptional() @IsString() @MaxLength(160) raisonSociale?: string;
  /** Nom commercial, en grand dans l'en-tête. */
  @IsOptional() @IsString() @MaxLength(80) nomCommercial?: string;
  @IsOptional() @IsString() @MaxLength(160) slogan?: string;
  @IsOptional() @IsString() @MaxLength(60) formeJuridique?: string;
  @IsOptional() @IsString() @MaxLength(60) capital?: string;
  @IsOptional() @IsString() @MaxLength(60) ninea?: string;
  @IsOptional() @IsString() @MaxLength(80) rccm?: string;
  @IsOptional() @IsString() @MaxLength(300) adresse?: string;
  @IsOptional() @IsString() @MaxLength(80) telephone?: string;
  @IsOptional() @IsString() @MaxLength(160) email?: string;
  @IsOptional() @IsString() @MaxLength(160) siteWeb?: string;
  @IsOptional() @IsString() @MaxLength(200) banque?: string;
  @IsOptional() @IsString() @MaxLength(300) mentionPied?: string;
}
