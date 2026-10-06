import type { FormEvent, ReactNode } from 'react';
import { Search } from 'lucide-react';
import type { LocationFilters as LocationFiltersValue } from '../../types/location';
import { typeBienLabel } from '../../utils/bienLabels';
import { useLocationFilterOptions } from '../../hooks/useLocations';
import { Button } from '../ui/Button';

interface LocationFiltersProps {
  value: LocationFiltersValue;
  onChange: (next: LocationFiltersValue) => void;
  onSubmit?: () => void;
  /**
   * Mode « feuille » (mobile) : les critères seuls, en une colonne ; la
   * recherche libre et les boutons sont portés par la page.
   */
  sheet?: boolean;
}

const inputClass =
  'w-full rounded-md border border-mtm-border bg-white px-3 py-2 text-sm text-mtm-text placeholder:text-mtm-muted focus:border-mtm-primary focus:outline-none focus:ring-1 focus:ring-mtm-primary';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-mtm-muted">{label}</span>
      {children}
    </label>
  );
}

const numberValue = (next: string): number | undefined => (next === '' ? undefined : Number(next));

/**
 * Filtres des locations. Les listes (types, zones, communes, chambres) viennent
 * de l'API et ne contiennent que ce que les annonces visibles proposent : un
 * critère qui ne renverrait rien n'est jamais offert.
 */
export function LocationFilters({ value, onChange, onSubmit, sheet = false }: LocationFiltersProps) {
  const { data: options } = useLocationFilterOptions();

  function set<K extends keyof LocationFiltersValue>(key: K, next: LocationFiltersValue[K]): void {
    onChange({ ...value, [key]: next, page: 1 });
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    onSubmit?.();
  }

  const gridClass = sheet
    ? 'grid grid-cols-1 gap-4'
    : 'grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4';

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-mtm-border bg-mtm-surface p-4 shadow-card sm:p-5">
      {!sheet && (
        <div className="relative mb-4">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mtm-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Recherche libre"
            placeholder="Quartier, commune, mot-clé…"
            className={`${inputClass} pl-9`}
            value={value.search ?? ''}
            onChange={(event) => set('search', event.target.value || undefined)}
          />
        </div>
      )}

      <div className={gridClass}>
        <Field label="Type de bien">
          <select
            className={inputClass}
            value={value.type ?? ''}
            onChange={(event) => set('type', event.target.value || undefined)}
          >
            <option value="">Tous les biens</option>
            {options?.type.map((type) => (
              <option key={type} value={type}>
                {typeBienLabel(type)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Région">
          <select
            className={inputClass}
            value={value.region ?? ''}
            onChange={(event) => set('region', event.target.value || undefined)}
          >
            <option value="">Toutes les régions</option>
            {options?.region.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Commune / quartier">
          <select
            className={inputClass}
            value={value.commune ?? ''}
            onChange={(event) => set('commune', event.target.value || undefined)}
          >
            <option value="">Toutes les communes</option>
            {options?.commune.map((commune) => (
              <option key={commune} value={commune}>
                {commune}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Chambres">
          <select
            className={inputClass}
            value={value.chambresMin ?? ''}
            onChange={(event) => set('chambresMin', numberValue(event.target.value))}
          >
            <option value="">Indifférent</option>
            {options?.chambres.map((nombre) => (
              <option key={nombre} value={nombre}>
                {nombre}+ chambre{nombre > 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Loyer minimum (FCFA)">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={10000}
            className={inputClass}
            placeholder={options?.loyerMin ? String(options.loyerMin) : '0'}
            value={value.loyerMin ?? ''}
            onChange={(event) => set('loyerMin', numberValue(event.target.value))}
          />
        </Field>

        <Field label="Loyer maximum (FCFA)">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={10000}
            className={inputClass}
            placeholder={options?.loyerMax ? String(options.loyerMax) : 'Sans limite'}
            value={value.loyerMax ?? ''}
            onChange={(event) => set('loyerMax', numberValue(event.target.value))}
          />
        </Field>

        <Field label="Surface minimum (m²)">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={5}
            className={inputClass}
            value={value.superficieMin ?? ''}
            onChange={(event) => set('superficieMin', numberValue(event.target.value))}
          />
        </Field>

        <Field label="Ameublement">
          <select
            className={inputClass}
            value={value.meuble === undefined ? '' : String(value.meuble)}
            onChange={(event) =>
              set('meuble', event.target.value === '' ? undefined : event.target.value === 'true')
            }
          >
            <option value="">Indifférent</option>
            <option value="true">Meublé</option>
            <option value="false">Non meublé</option>
          </select>
        </Field>
      </div>

      {!sheet && (
        <div className="mt-4 flex justify-end">
          <Button type="submit">Rechercher</Button>
        </div>
      )}
    </form>
  );
}
