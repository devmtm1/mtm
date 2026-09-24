import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/** « true »/« 1 » d'un envoi multipart ou booléen d'un corps JSON. */
const versBooleen = ({ value }: { value: unknown }): unknown => {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return value;
};

/** Pièce jointe d'un bail : contrat scanné, état des lieux, autre document. */
export class CreateDocumentLocatifDto {
  @IsString() @MaxLength(60) type!: string;
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @Transform(versBooleen) @IsBoolean() visibleLocataire?: boolean;
  @IsOptional()
  @Transform(versBooleen)
  @IsBoolean()
  visibleProprietaire?: boolean;
}

/**
 * Visibilités d'une pièce. Deux drapeaux distincts : publier une quittance au
 * locataire ne doit pas l'exposer au propriétaire, et inversement pour un
 * relevé de gestion.
 */
export class VisibiliteDocumentDto {
  @IsOptional() @Transform(versBooleen) @IsBoolean() visibleLocataire?: boolean;
  @IsOptional()
  @Transform(versBooleen)
  @IsBoolean()
  visibleProprietaire?: boolean;
}
