/**
 * Drapeau à côté d'un témoignage : signale un client de la diaspora sans
 * avoir besoin d'une catégorie de témoignages dédiée (section 4 du cahier
 * des charges — cible prioritaire).
 *
 * Convention de saisie en back-office : le champ « Auteur » d'un témoignage
 * accepte `Nom | Pays` (ex. « Awa Diop | France »). Un titre sans « | »
 * reste affiché tel quel, sans pays ni drapeau — rétrocompatible avec les
 * témoignages déjà saisis.
 */

/** Pays les plus probables pour la clientèle de MTM, hors Sénégal. */
const COUNTRY_CODES: Record<string, string> = {
  france: 'FR',
  'etats-unis': 'US',
  usa: 'US',
  canada: 'CA',
  italie: 'IT',
  espagne: 'ES',
  belgique: 'BE',
  allemagne: 'DE',
  'royaume-uni': 'GB',
  angleterre: 'GB',
  suisse: 'CH',
  'pays-bas': 'NL',
  portugal: 'PT',
  maroc: 'MA',
  "cote d'ivoire": 'CI',
  mali: 'ML',
  mauritanie: 'MR',
  gabon: 'GA',
  senegal: 'SN',
  guinee: 'GN',
  cameroun: 'CM',
  gambie: 'GM',
  'arabie saoudite': 'SA',
  'emirats arabes unis': 'AE',
  qatar: 'QA',
  chine: 'CN',
};

/** Minuscules, sans accents, apostrophe courbe uniformisée : pour comparer sans piège de saisie. */
function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[‘’']/g, "'")
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Code ISO 3166-1 alpha-2 → emoji drapeau (séquence d'indicateurs régionaux Unicode). */
function codeToFlag(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

/** `null` si le pays n'est pas reconnu : mieux vaut ne rien afficher qu'un drapeau erroné. */
export function countryFlag(country: string): string | null {
  const code = COUNTRY_CODES[normalize(country)];
  return code ? codeToFlag(code) : null;
}

export interface TestimonialAuthor {
  name: string;
  country: string | null;
}

/** Sépare `Nom | Pays` ; un titre sans séparateur redevient simplement le nom. */
export function parseTestimonialAuthor(title: string): TestimonialAuthor {
  const [name, country] = title.split('|').map((part) => part.trim());
  return { name: name || title.trim(), country: country || null };
}
