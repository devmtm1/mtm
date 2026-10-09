/** « Awa Diop » → « AD » : repli lisible quand une photo n'a pas encore été ajoutée. */
export function initiales(nom: string): string {
  const mots = nom.trim().split(/\s+/).filter(Boolean);
  const lettres = (mots.length > 1 ? [mots[0], mots[mots.length - 1]] : mots).map((mot) =>
    mot.charAt(0),
  );
  return lettres.join('').toUpperCase().slice(0, 2);
}
