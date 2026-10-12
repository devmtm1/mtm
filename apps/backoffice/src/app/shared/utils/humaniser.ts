/**
 * Lit un code technique comme du texte : « attente_notaire » → « Attente notaire ».
 * Sert d'étiquette de repli pour une étape ajoutée par MTM, qui n'a pas de libellé écrit.
 */
export function humaniserCode(code: string): string {
  const texte = code.replace(/_/g, ' ').trim();
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

/** Transforme un nom saisi (« Attente du notaire ») en code d'étape (« attente_du_notaire »). */
export function codeDepuisNom(nom: string): string {
  return nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}
