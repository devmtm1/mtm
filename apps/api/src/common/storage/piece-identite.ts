import { BadRequestException } from '@nestjs/common';
import { TYPES_PIECE_IDENTITE } from '../../modules/demarches/identite-client';
import { validateUploadedAsset } from './asset-validation';
import type { CloudinaryService } from './cloudinary.service';

/** Types de pièce proposés dans les formulaires : le même vocabulaire que les fiches prospects. */
export const TYPES_PIECE = TYPES_PIECE_IDENTITE;

interface ChampsPiece {
  pieceStorageKey?: string | null;
  pieceResourceType?: string | null;
}

/** La copie de la pièce doit être un PDF : refuse tout autre format avant l'envoi. */
export function validerPiecePdf(file: Express.Multer.File): void {
  if (!file?.buffer) throw new BadRequestException('Aucun fichier reçu');
  if (file.mimetype !== 'application/pdf') {
    throw new BadRequestException('La pièce doit être un fichier PDF');
  }
  validateUploadedAsset(file, 'document');
}

/**
 * Fiche sans la clé de stockage, avec un lien signé vers le PDF (`pieceUrl`, vide s'il n'y en a pas) : la clé
 * Cloudinary ne sort jamais de l'API.
 */
export function exposerPiece<T extends ChampsPiece>(
  fiche: T,
  cloudinary: CloudinaryService,
): Omit<T, 'pieceStorageKey' | 'pieceResourceType'> & {
  pieceUrl: string | null;
} {
  const { pieceStorageKey, pieceResourceType, ...reste } = fiche;
  return {
    ...reste,
    pieceUrl: pieceStorageKey
      ? cloudinary.url(pieceStorageKey, pieceResourceType ?? 'raw', false)
      : null,
  };
}

/**
 * Prépare les dates de la fiche pour la base : elles arrivent en texte (AAAA-MM-JJ), Prisma attend une date ;
 * `null` efface la valeur, l'absence de champ la laisse intacte.
 */
type ChampDate = 'dateNaissance' | 'pieceValiditeLe';

export function preparerEtatCivil<T extends object>(
  dto: T,
): Omit<T, ChampDate> & Partial<Record<ChampDate, Date | null>> {
  const copie = { ...dto } as Record<string, unknown>;
  for (const champ of ['dateNaissance', 'pieceValiditeLe'] as const) {
    const valeur = copie[champ] as string | Date | null | undefined;
    if (valeur === undefined) continue;
    copie[champ] = valeur ? new Date(valeur) : null;
  }
  return copie as Omit<T, ChampDate> & Partial<Record<ChampDate, Date | null>>;
}
