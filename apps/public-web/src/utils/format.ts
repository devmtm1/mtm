/**
 * Nombre groupé par milliers. Le français met une espace fine insécable (U+202F)
 * que la plupart des polices dessinent à peine : « 18 500 000 » se lit
 * « 18500000 ». On la remplace par l'espace insécable ordinaire, plus large et
 * qui ne coupe jamais un montant en fin de ligne.
 */
export function groupDigits(value: number): string {
  return value.toLocaleString('fr-FR').replace(/\u202f/g, '\u00a0');
}

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'Prix sur demande';
  return `${groupDigits(Math.round(value))} FCFA`;
}

export function formatSuperficie(value: number | null, unite: string | null): string {
  if (value === null) return '—';
  return `${groupDigits(value)} ${unite ?? 'm²'}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/** « 14/09/2026 » : pour les listes denses (échéancier, paiements) sur petit écran. */
export function formatDateShort(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** « septembre 2026 » : date courte des cartes du portfolio. */
export function formatMonthYear(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}
