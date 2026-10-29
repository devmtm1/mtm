/**
 * Types de pièce d'identité d'un client, avec le libellé imprimé sur les
 * documents. Seul le **type** figure sur une facture ou un rapport, jamais le
 * numéro : le document circule (WhatsApp, e-mail) et un numéro de pièce
 * n'a rien à y faire.
 */
export const TYPES_PIECE_IDENTITE = [
  'cni_cedeao',
  'passeport',
  'titre_sejour',
  'permis',
  'autre',
] as const;

const LIBELLES: Record<string, string> = {
  cni_cedeao: 'Carte d’identité CEDEAO',
  passeport: 'Passeport',
  titre_sejour: 'Titre de séjour',
  permis: 'Permis de conduire',
  autre: 'Pièce d’identité',
};

/** « Carte d'identité CEDEAO présentée au dossier », ou `null` sans pièce déclarée. */
export function libellePieceIdentite(
  type: string | null | undefined,
): string | null {
  if (!type) return null;
  return `${LIBELLES[type] ?? 'Pièce d’identité'} présentée au dossier`;
}
