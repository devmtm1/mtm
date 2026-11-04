/**
 * Un numéro de téléphone ramené à une forme unique, pour qu'un même numéro saisi de plusieurs façons
 * (« 77 123 45 67 », « +221 77 123 45 67 », « 00221771234567 ») désigne toujours le même compte.
 *
 * Renvoie le format international (`+221771234567`), ou `null` si ce n'est pas un numéro exploitable. Un numéro
 * sénégalais s'écrit à 9 chiffres (mobile 7x, fixe 3x) ; un autre pays se saisit avec son indicatif (`+33…`, `00 33…`).
 */
export function normaliserTelephone(
  saisie: string | null | undefined,
): string | null {
  if (!saisie) return null;
  const brut = saisie.trim();
  if (/[^\d\s+().-]/.test(brut)) return null;
  const chiffres = brut.replace(/\D/g, '');
  if (!chiffres) return null;

  let international: string;
  if (brut.startsWith('+')) international = chiffres;
  else if (chiffres.startsWith('00')) international = chiffres.slice(2);
  else if (/^[37]\d{8}$/.test(chiffres)) international = '221' + chiffres;
  else if (/^221[37]\d{8}$/.test(chiffres)) international = chiffres;
  else return null;

  // Le plan international E.164 : 8 à 15 chiffres, sans zéro initial.
  if (!/^[1-9]\d{7,14}$/.test(international)) return null;
  return '+' + international;
}

/** Vrai quand l'identifiant saisi à la connexion est une adresse e-mail (sinon, c'est un numéro). */
export function estAdresseEmail(identifiant: string): boolean {
  return identifiant.includes('@');
}
