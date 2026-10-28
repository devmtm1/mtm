/** Pièce d'identité facultative d'un propriétaire ou d'un locataire : type, numéro et copie PDF. */
export const TYPES_PIECE = [
  { valeur: 'cni', libelle: 'Carte nationale d’identité' },
  { valeur: 'passeport', libelle: 'Passeport' },
  { valeur: 'titre_sejour', libelle: 'Titre de séjour' },
  { valeur: 'permis', libelle: 'Permis de conduire' },
  { valeur: 'autre', libelle: 'Autre pièce' },
] as const;

export function libellePiece(code: string | null | undefined): string {
  return TYPES_PIECE.find((type) => type.valeur === code)?.libelle ?? '';
}

/** Champs portés par la fiche renvoyée par l'API : le lien du PDF est vide s'il n'y a pas de copie. */
export interface PieceIdentite {
  typePiece?: string | null;
  numeroPiece?: string | null;
  pieceUrl?: string | null;
}

export const TAILLE_MAX_PIECE = 10 * 1024 * 1024;

/** Le message d'erreur d'un fichier refusé, ou `null` s'il convient (PDF, 10 Mo au maximum). */
export function erreurFichierPiece(fichier: File): string | null {
  const pdf = fichier.type === 'application/pdf' || /\.pdf$/i.test(fichier.name);
  if (!pdf) return 'La copie de la pièce doit être un fichier PDF.';
  if (fichier.size > TAILLE_MAX_PIECE) return 'Le fichier ne doit pas dépasser 10 Mo.';
  return null;
}
