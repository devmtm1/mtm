import type { LocationFilters } from '../../types/location';
import { typeBienLabel } from '../../utils/bienLabels';
import { formatLoyerMontant } from '../../utils/locationFormat';

export interface LocationChip {
  key: string;
  label: string;
  /** Champs à effacer quand la puce est retirée (une fourchette en a deux). */
  clears: (keyof LocationFilters)[];
}

function range(min: number | undefined, max: number | undefined, fmt: (n: number) => string): string {
  if (min !== undefined && max !== undefined) return `${fmt(min)} – ${fmt(max)}`;
  if (min !== undefined) return `≥ ${fmt(min)}`;
  return `≤ ${fmt(max as number)}`;
}

/** Puces lisibles des filtres actifs, dans l'ordre du formulaire. */
export function activeLocationChips(filters: LocationFilters): LocationChip[] {
  const chips: LocationChip[] = [];
  if (filters.type) chips.push({ key: 'type', label: typeBienLabel(filters.type), clears: ['type'] });
  if (filters.region) chips.push({ key: 'region', label: filters.region, clears: ['region'] });
  if (filters.commune) chips.push({ key: 'commune', label: filters.commune, clears: ['commune'] });
  if (filters.loyerMin !== undefined || filters.loyerMax !== undefined) {
    chips.push({
      key: 'loyer',
      label: range(filters.loyerMin, filters.loyerMax, (n) => formatLoyerMontant(n)),
      clears: ['loyerMin', 'loyerMax'],
    });
  }
  if (filters.chambresMin !== undefined) {
    chips.push({
      key: 'chambres',
      label: `${filters.chambresMin}+ chambre${filters.chambresMin > 1 ? 's' : ''}`,
      clears: ['chambresMin'],
    });
  }
  if (filters.superficieMin !== undefined) {
    chips.push({
      key: 'superficie',
      label: `≥ ${filters.superficieMin.toLocaleString('fr-FR')} m²`,
      clears: ['superficieMin'],
    });
  }
  if (filters.meuble !== undefined) {
    chips.push({ key: 'meuble', label: filters.meuble ? 'Meublé' : 'Non meublé', clears: ['meuble'] });
  }
  if (filters.search) chips.push({ key: 'search', label: `« ${filters.search} »`, clears: ['search'] });
  return chips;
}
