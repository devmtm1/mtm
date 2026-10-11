/**
 * Numérotation des missions et de leurs factures, paramétrable en back-office.
 *
 * Un format est un texte où trois jetons sont remplacés :
 *   {code}   code de la famille de prestation (VF, DA, PT…)
 *   {annee}  année de l'émission sur quatre chiffres
 *   {seq:N}  rang dans l'année pour ce code, complété par des zéros sur N
 *            chiffres (`{seq}` seul = 3 chiffres)
 *
 * Exemple : `MTM-{code}-{seq:3}/{annee}` donne `MTM-VF-001/2026`.
 */

/** Clés des paramètres. */
export const REFERENCE_SETTING_KEYS = {
  mission: 'demarches.referenceFormat',
  facture: 'demarches.factureFormat',
  codes: 'demarches.codesFamille',
} as const;

export const FORMAT_MISSION_DEFAUT = 'MTM-{code}-{seq:3}/{annee}';
export const FORMAT_FACTURE_DEFAUT = 'MTM-FAC-{code}-{seq:3}/{annee}';
export const CODES_FAMILLE_DEFAUT: Record<string, string> = {
  verification: 'VF',
  demarche: 'DA',
  technique: 'PT',
};

const JETON_SEQ = /\{seq(?::(\d{1,2}))?\}/;

/**
 * Un format est utilisable s'il contient un rang (sinon deux dossiers auraient la
 * même référence) et rien d'autre que les jetons connus entre accolades.
 */
export function formatReferenceValide(format: unknown): format is string {
  if (typeof format !== 'string') return false;
  const texte = format.trim();
  if (!texte || texte.length > 80) return false;
  if (!JETON_SEQ.test(texte)) return false;
  // Un seul rang, et pas d'accolade inconnue.
  if ((texte.match(/\{seq(?::\d{1,2})?\}/g) ?? []).length !== 1) return false;
  const sansJetons = texte
    .replace(/\{seq(?::\d{1,2})?\}/g, '')
    .replace(/\{code\}/g, '')
    .replace(/\{annee\}/g, '');
  return !/[{}]/.test(sansJetons);
}

interface ContexteReference {
  code: string;
  annee: number;
}

function remplacer(texte: string, contexte: ContexteReference): string {
  return texte
    .replace(/\{code\}/g, contexte.code)
    .replace(/\{annee\}/g, String(contexte.annee));
}

/**
 * Découpe un format autour de son rang : tout ce qui précède, tout ce qui
 * suit, et la largeur du rang. Sert à retrouver les références déjà émises
 * (même début, même fin) et à lire leur rang.
 */
export function decouperFormat(format: string, contexte: ContexteReference) {
  const correspondance = JETON_SEQ.exec(format);
  if (!correspondance) {
    throw new Error(`Format de référence sans rang : ${format}`);
  }
  const largeur = correspondance[1] ? Number(correspondance[1]) : 3;
  return {
    prefixe: remplacer(format.slice(0, correspondance.index), contexte),
    suffixe: remplacer(
      format.slice(correspondance.index + correspondance[0].length),
      contexte,
    ),
    largeur,
  };
}

export function construireReference(
  format: string,
  contexte: ContexteReference,
  rang: number,
): string {
  const { prefixe, suffixe, largeur } = decouperFormat(format, contexte);
  return `${prefixe}${String(rang).padStart(largeur, '0')}${suffixe}`;
}

/** Rang d'une référence déjà émise sous ce format, ou `null` si elle n'en relève pas. */
export function rangDeReference(
  format: string,
  contexte: ContexteReference,
  reference: string,
): number | null {
  const { prefixe, suffixe } = decouperFormat(format, contexte);
  if (!reference.startsWith(prefixe) || !reference.endsWith(suffixe)) {
    return null;
  }
  const milieu = reference.slice(
    prefixe.length,
    reference.length - suffixe.length,
  );
  return /^\d+$/.test(milieu) ? Number(milieu) : null;
}
