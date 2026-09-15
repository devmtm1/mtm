import type { TerrainFilters } from '../../types/terrain';
import { formatMoney } from '../../utils/format';

export interface FilterChip {
  key: string;
  label: string;
  /** Champs à effacer quand la puce est retirée (une fourchette en a deux). */
  clears: (keyof TerrainFilters)[];
}

/** Puces lisibles des filtres actifs, dans l'ordre du formulaire. */
export function activeFilterChips(filters: TerrainFilters): FilterChip[] {
  const chips: FilterChip[] = [];
  if (filters.region) chips.push({ key: 'region', label: filters.region, clears: ['region'] });
  if (filters.commune) chips.push({ key: 'commune', label: filters.commune, clears: ['commune'] });
  if (filters.vocation) chips.push({ key: 'vocation', label: filters.vocation, clears: ['vocation'] });
  if (filters.statutJuridique) chips.push({ key: 'statut', label: filters.statutJuridique, clears: ['statutJuridique'] });
  if (filters.superficieMin !== undefined || filters.superficieMax !== undefined) {
    chips.push({
      key: 'superficie',
      label: range(filters.superficieMin, filters.superficieMax, (n) => `${n.toLocaleString('fr-FR')} m²`),
      clears: ['superficieMin', 'superficieMax'],
    });
  }
  if (filters.prixPublicMin !== undefined || filters.prixPublicMax !== undefined) {
    chips.push({
      key: 'budget',
      label: range(filters.prixPublicMin, filters.prixPublicMax, (n) => formatMoney(n)),
      clears: ['prixPublicMin', 'prixPublicMax'],
    });
  }
  if (filters.search) chips.push({ key: 'search', label: `« ${filters.search} »`, clears: ['search'] });
  return chips;
}

function range(min: number | undefined, max: number | undefined, fmt: (n: number) => string): string {
  if (min !== undefined && max !== undefined) return `${fmt(min)} – ${fmt(max)}`;
  if (min !== undefined) return `≥ ${fmt(min)}`;
  return `≤ ${fmt(max as number)}`;
}
