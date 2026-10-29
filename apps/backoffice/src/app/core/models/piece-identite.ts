/**
 * Identité d'une personne (prospect, propriétaire ou locataire) : un seul vocabulaire pour les types de pièce,
 * le même que l'API et que les fiches prospects.
 */
export const TYPES_PIECE = [
  { valeur: 'cni_cedeao', libelle: 'Carte d’identité CEDEAO' },
  { valeur: 'passeport', libelle: 'Passeport' },
  { valeur: 'titre_sejour', libelle: 'Titre de séjour' },
  { valeur: 'permis', libelle: 'Permis de conduire' },
  { valeur: 'autre', libelle: 'Autre pièce' },
] as const;

export function libellePiece(code: string | null | undefined): string {
  return TYPES_PIECE.find((type) => type.valeur === code)?.libelle ?? '';
}

/** Champs d'identité portés par la fiche d'un propriétaire ou d'un locataire. */
export interface PieceIdentite {
  typePiece?: string | null;
  numeroPiece?: string | null;
  pieceUrl?: string | null;
  adresse?: string | null;
  dateNaissance?: string | null;
  lieuNaissance?: string | null;
  nationalite?: string | null;
  profession?: string | null;
  pieceValiditeLe?: string | null;
  urgenceNom?: string | null;
  urgenceLien?: string | null;
  urgenceTelephone?: string | null;
}

export const TAILLE_MAX_PIECE = 10 * 1024 * 1024;

/** Le message d'erreur d'un fichier refusé, ou `null` s'il convient (PDF, 10 Mo au maximum). */
export function erreurFichierPiece(fichier: File): string | null {
  const pdf = fichier.type === 'application/pdf' || /\.pdf$/i.test(fichier.name);
  if (!pdf) return 'La copie de la pièce doit être un fichier PDF.';
  if (fichier.size > TAILLE_MAX_PIECE) return 'Le fichier ne doit pas dépasser 10 Mo.';
  return null;
}
