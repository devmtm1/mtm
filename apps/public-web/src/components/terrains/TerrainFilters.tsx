import type { FormEvent } from 'react';
import { Search } from 'lucide-react';
import type { TerrainFilters as TerrainFiltersValue } from '../../types/terrain';
import { Button } from '../ui/Button';

const STATUT_JURIDIQUE_OPTIONS = [
  'Titre foncier',
  'Bail',
  'Délibération',
  'Morcellement',
  'Régularisation en cours',
];

interface TerrainFiltersProps {
  value: TerrainFiltersValue;
  onChange: (next: TerrainFiltersValue) => void;
  onSubmit?: () => void;
  compact?: boolean;
}

const inputClass =
  'w-full rounded-md border border-mtm-border bg-white px-3 py-2 text-sm text-mtm-text placeholder:text-mtm-muted focus:border-mtm-primary focus:outline-none focus:ring-1 focus:ring-mtm-primary';
const labelClass = 'text-xs font-semibold text-mtm-muted';

export function TerrainFilters({ value, onChange, onSubmit, compact = false }: TerrainFiltersProps) {
  function set<K extends keyof TerrainFiltersValue>(key: K, next: TerrainFiltersValue[K]): void {
    onChange({ ...value, [key]: next, page: 1 });
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    onSubmit?.();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`grid gap-3 rounded-lg border border-mtm-border bg-mtm-surface p-4 shadow-card ${
        compact ? 'sm:grid-cols-2 lg:grid-cols-5' : 'sm:grid-cols-2 lg:grid-cols-3'
      }`}
    >
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Région / zone</span>
        <input
          type="text"
          className={inputClass}
          placeholder="Ex. Thiès, Mbour..."
          value={value.region ?? ''}
          onChange={(event) => set('region', event.target.value || undefined)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className={labelClass}>Type de terrain</span>
        <input
          type="text"
          className={inputClass}
          placeholder="Résidentiel, commercial..."
          value={value.vocation ?? ''}
          onChange={(event) => set('vocation', event.target.value || undefined)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className={labelClass}>Statut juridique</span>
        <select
          className={inputClass}
          value={value.statutJuridique ?? ''}
          onChange={(event) => set('statutJuridique', event.target.value || undefined)}
        >
          <option value="">Tous</option>
          {STATUT_JURIDIQUE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className={labelClass}>Superficie min. (m²)</span>
        <input
          type="number"
          min={0}
          className={inputClass}
          value={value.superficieMin ?? ''}
          onChange={(event) => set('superficieMin', event.target.value ? Number(event.target.value) : undefined)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className={labelClass}>Budget max. (FCFA)</span>
        <input
          type="number"
          min={0}
          className={inputClass}
          value={value.prixPublicMax ?? ''}
          onChange={(event) => set('prixPublicMax', event.target.value ? Number(event.target.value) : undefined)}
        />
      </label>

      <div className="flex items-end">
        <Button type="submit" className="w-full">
          <Search className="h-4 w-4" aria-hidden="true" />
          Rechercher
        </Button>
      </div>
    </form>
  );
}
