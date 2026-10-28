import { BadRequestException } from '@nestjs/common';
import { validateUploadedAsset } from './asset-validation';
import type { CloudinaryService } from './cloudinary.service';

/** Types de pièce proposés dans les formulaires (propriétaires et locataires). */
export const TYPES_PIECE = [
  'cni',
  'passeport',
  'titre_sejour',
  'permis',
  'autre',
] as const;

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
