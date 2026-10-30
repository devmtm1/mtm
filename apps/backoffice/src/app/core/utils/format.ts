const ESPACE_FINE = String.fromCharCode(0x202f);
const ESPACE_INSECABLE = String.fromCharCode(0x00a0);

/**
 * Nombre au format français, avec une espace insécable ordinaire entre les milliers.
 *
 * `toLocaleString('fr-FR')` sépare les milliers par une espace fine insécable (U+202F) que la plupart des polices
 * dessinent presque invisible : « 41 000 000 » se lit alors « 41000000 ». On la remplace par l'espace insécable usuelle.
 */
export function nombreFr(valeur: number, options?: Intl.NumberFormatOptions): string {
  return valeur.toLocaleString('fr-FR', options).split(ESPACE_FINE).join(ESPACE_INSECABLE);
}

/** Montant en FCFA : « 12 500 000 FCFA », l'espace avant l'unité étant insécable pour ne pas la couper en fin de ligne. */
export function montantFcfa(valeur: number): string {
  return `${nombreFr(valeur)}${ESPACE_INSECABLE}FCFA`;
}
