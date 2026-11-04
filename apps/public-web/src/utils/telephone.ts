/**
 * Règle des numéros de téléphone du site : la même que celle de l'API (qui reste l'autorité). Un numéro sénégalais
 * s'écrit à 9 chiffres (mobile 7x, fixe 3x), avec ou sans +221 ; un autre pays se saisit avec son indicatif
 * (« +33 6 12 34 56 78 » ou « 0033 6 12 34 56 78 »).
 */
export const MESSAGE_TELEPHONE_INVALIDE =
  'Ce numéro de téléphone n’est pas valable : 9 chiffres pour le Sénégal (77 123 45 67) ou avec l’indicatif du pays (+33 6 12 34 56 78).';

/** Le numéro au format international (`+221771234567`), ou `null` si ce n'est pas un numéro exploitable. */
export function normaliserTelephone(saisie: string): string | null {
  const brut = saisie.trim();
  if (!brut || /[^\d\s+().-]/.test(brut)) return null;
  const chiffres = brut.replace(/\D/g, '');
  if (!chiffres) return null;

  let international: string;
  if (brut.startsWith('+')) international = chiffres;
  else if (chiffres.startsWith('00')) international = chiffres.slice(2);
  else if (/^[37]\d{8}$/.test(chiffres)) international = `221${chiffres}`;
  else if (/^221[37]\d{8}$/.test(chiffres)) international = chiffres;
  else return null;

  return /^[1-9]\d{7,14}$/.test(international) ? `+${international}` : null;
}

export function isValidTelephone(saisie: string): boolean {
  return normaliserTelephone(saisie) !== null;
}

/**
 * À la frappe : seuls les chiffres, espaces, « + » (au début), parenthèses, points et tirets passent, et la longueur
 * est plafonnée selon le format : 12 chiffres avec 221, 9 sans indicatif (numéro sénégalais), 15 au plus avec un
 * indicatif en « + » ou « 00 ».
 */
export function saisieTelephone(valeur: string): string {
  const propre = valeur.replace(/[^\d\s+().-]/g, '');
  const plus = propre.trimStart().startsWith('+');
  const texte = (plus ? '+' : '') + propre.replace(/\+/g, '').trimStart();
  const chiffres = texte.replace(/\D/g, '');
  let max = 9;
  if (plus) max = 15;
  else if (chiffres.startsWith('00')) max = 17;
  else if (chiffres.startsWith('221')) max = 12;
  let resultat = '';
  let compte = 0;
  for (const caractere of texte) {
    if (/\d/.test(caractere)) {
      if (compte >= max) break;
      compte += 1;
    }
    resultat += caractere;
  }
  return resultat;
}
