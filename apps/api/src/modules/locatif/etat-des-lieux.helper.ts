/**
 * État des lieux : l'état de chaque pièce à l'entrée et à la sortie, et ce qui
 * s'est dégradé entre les deux — la base d'une retenue justifiée sur la caution.
 */

export const ETATS_PIECE = ['bon', 'usage', 'degrade', 'hors_service'] as const;
export type EtatPiece = (typeof ETATS_PIECE)[number];

export interface LignePiece {
  piece: string;
  etat: EtatPiece;
  observation?: string | null;
}

/** Plus le rang est haut, plus l'état est mauvais. */
const RANG: Record<EtatPiece, number> = {
  bon: 0,
  usage: 1,
  degrade: 2,
  hors_service: 3,
};

export const LIBELLES_ETAT_PIECE: Record<EtatPiece, string> = {
  bon: 'Bon état',
  usage: 'Usure normale',
  degrade: 'Dégradé',
  hors_service: 'Hors service',
};

/** Pièces proposées d'office pour un état des lieux neuf. */
export const PIECES_PAR_DEFAUT = [
  'Entrée',
  'Salon',
  'Cuisine',
  'Chambre 1',
  'Salle d’eau',
  'WC',
  'Extérieur',
] as const;

export interface ComparaisonPiece {
  piece: string;
  /** État à l'entrée ; `null` si la pièce n'y figurait pas. */
  avant: EtatPiece | null;
  apres: EtatPiece;
  observation: string | null;
  /** Vrai quand la pièce est moins bonne à la sortie qu'à l'entrée. */
  degradation: boolean;
}

const cle = (piece: string): string => piece.trim().toLocaleLowerCase('fr');

/**
 * Compare la sortie à l'entrée, pièce par pièce. Une pièce absente de l'entrée
 * n'est jamais comptée comme dégradée : sans état de départ, on ne peut rien lui
 * reprocher.
 */
export function comparerEtats(
  entree: LignePiece[],
  sortie: LignePiece[],
): ComparaisonPiece[] {
  const avant = new Map(entree.map((ligne) => [cle(ligne.piece), ligne.etat]));
  return sortie.map((ligne) => {
    const etatAvant = avant.get(cle(ligne.piece)) ?? null;
    return {
      piece: ligne.piece,
      avant: etatAvant,
      apres: ligne.etat,
      observation: ligne.observation?.trim() || null,
      degradation: etatAvant !== null && RANG[ligne.etat] > RANG[etatAvant],
    };
  });
}

/** Nombre de pièces dégradées entre l'entrée et la sortie. */
export function compterDegradations(comparaison: ComparaisonPiece[]): number {
  return comparaison.filter((ligne) => ligne.degradation).length;
}

/** Lit la colonne JSON `pieces` sans faire confiance à son contenu. */
export function lirePieces(valeur: unknown): LignePiece[] {
  if (!Array.isArray(valeur)) return [];
  const lignes: LignePiece[] = [];
  for (const element of valeur) {
    if (!element || typeof element !== 'object') continue;
    const { piece, etat, observation } = element as Record<string, unknown>;
    if (typeof piece !== 'string' || !piece.trim()) continue;
    if (!(ETATS_PIECE as readonly unknown[]).includes(etat)) continue;
    lignes.push({
      piece: piece.trim(),
      etat: etat as EtatPiece,
      observation: typeof observation === 'string' ? observation : null,
    });
  }
  return lignes;
}
