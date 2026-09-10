export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'Prix sur demande';
  return `${Math.round(value).toLocaleString('fr-FR')} FCFA`;
}

export function formatSuperficie(value: number | null, unite: string | null): string {
  if (value === null) return '—';
  return `${value.toLocaleString('fr-FR')} ${unite ?? 'm²'}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}
