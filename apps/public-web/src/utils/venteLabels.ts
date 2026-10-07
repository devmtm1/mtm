import { formatMonthYear } from './format';

/** « Vendu en octobre 2026 », ou « Vendu » quand la date n'est pas connue. */
export function venduLabel(venduLe: string | null | undefined): string {
  return venduLe ? `Vendu en ${formatMonthYear(venduLe)}` : 'Vendu';
}

export function estVendu(terrain: { statutCommercial?: string | null }): boolean {
  return terrain.statutCommercial === 'Vendu';
}
