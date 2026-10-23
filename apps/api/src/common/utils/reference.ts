/**
 * Matricules lisibles (T-2026-0014, M-2026-0007…) : un préfixe, l'année, puis un rang qui repart de 1
 * chaque année. Le rang suivant se déduit des matricules déjà émis sous le même préfixe : une
 * suppression ou une saisie à la main (ancien mode, import) ne fait jamais réutiliser un numéro.
 */

/** Rang d'un matricule sous un préfixe (`T-2026-` + `0014` → 14), ou `null` s'il n'a pas ce format. */
export function rangDeReference(
  prefixe: string,
  reference: string,
): number | null {
  if (!reference.startsWith(prefixe)) return null;
  const reste = reference.slice(prefixe.length);
  return /^\d+$/.test(reste) ? Number(reste) : null;
}

/** Matricule suivant : un de plus que le plus grand rang déjà émis sous ce préfixe. */
export function referenceSuivante(
  prefixe: string,
  existantes: readonly string[],
  largeur = 4,
): string {
  let dernier = 0;
  for (const reference of existantes) {
    const rang = rangDeReference(prefixe, reference);
    if (rang !== null && rang > dernier) dernier = rang;
  }
  return `${prefixe}${String(dernier + 1).padStart(largeur, '0')}`;
}

/** Erreur « valeur déjà prise » de Prisma sur la colonne du matricule (deux créations simultanées). */
export function estConflitDeReference(
  erreur: unknown,
  colonne = 'referenceInterne',
): boolean {
  if (typeof erreur !== 'object' || erreur === null) return false;
  const { code, meta } = erreur as {
    code?: string;
    meta?: { target?: unknown };
  };
  if (code !== 'P2002') return false;
  const cible = meta?.target;
  return Array.isArray(cible)
    ? cible.includes(colonne)
    : typeof cible === 'string' && cible.includes(colonne);
}
