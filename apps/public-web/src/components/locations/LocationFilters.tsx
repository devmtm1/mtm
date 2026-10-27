import { useState, type FormEvent, type ReactNode } from 'react';
import { ChevronDown, MapPin, Search } from 'lucide-react';
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
  /** Au-dessus de la recherche (panneau seulement) : le choix « Au mois / Courte durée » quand il a un sens. */
  header?: ReactNode;
  /** Remet tous les critères à zéro (panneau seulement). */
  onReset?: () => void;
}

const inputClass =
  'w-full rounded-lg border border-mtm-border bg-white px-3 py-2.5 text-sm text-mtm-text placeholder:text-mtm-muted focus:border-mtm-primary focus:outline-none focus:ring-1 focus:ring-mtm-primary';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-mtm-muted">{label}</span>
      {children}
    </label>
  );
}

const numberValue = (next: string): number | undefined => (next === '' ? undefined : Number(next));

/** Critères du second niveau : ils restent rangés tant qu'aucun n'est utilisé. */
function criteresAvancesActifs(value: LocationFiltersValue): number {
  return [value.region, value.loyerMin, value.superficieMin, value.meuble].filter((critere) => critere !== undefined && critere !== '').length;
}

/**
 * Filtres des locations. Les listes (types, zones, communes, chambres) viennent
 * de l'API et ne contiennent que ce que les annonces visibles proposent : un
 * critère qui ne renverrait rien n'est jamais offert.
 *
 * Panneau (ordinateur) : la recherche libre et quatre critères essentiels sont toujours visibles ; les autres
 * (région, loyer minimum, surface, ameublement) s'ouvrent avec « Plus de filtres », pour que la page reste aérée.
 * Feuille (mobile) : tous les critères, en une colonne.
 */
export function LocationFilters({ value, onChange, onSubmit, sheet = false, header, onReset }: LocationFiltersProps) {
  const { data: options } = useLocationFilterOptions();
  const avances = criteresAvancesActifs(value);
  const [ouvert, setOuvert] = useState(avances > 0);

  function set<K extends keyof LocationFiltersValue>(key: K, next: LocationFiltersValue[K]): void {
    onChange({ ...value, [key]: next, page: 1 });
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    onSubmit?.();
  }

  const champType = (
    <Field label="Type de bien">
      <select className={inputClass} value={value.type ?? ''} onChange={(event) => set('type', event.target.value || undefined)}>
        <option value="">Tous les biens</option>
        {options?.type.map((type) => (
          <option key={type} value={type}>
            {typeBienLabel(type)}
          </option>
        ))}
      </select>
    </Field>
  );
  const champRegion = (
    <Field label="Région">
      <select className={inputClass} value={value.region ?? ''} onChange={(event) => set('region', event.target.value || undefined)}>
        <option value="">Toutes les régions</option>
        {options?.region.map((region) => (
          <option key={region} value={region}>
            {region}
          </option>
        ))}
      </select>
    </Field>
  );
  const champCommune = (
    <Field label="Commune / quartier">
      <select className={inputClass} value={value.commune ?? ''} onChange={(event) => set('commune', event.target.value || undefined)}>
        <option value="">Toutes les communes</option>
        {options?.commune.map((commune) => (
          <option key={commune} value={commune}>
            {commune}
          </option>
        ))}
      </select>
    </Field>
  );
  const champChambres = (
    <Field label="Chambres">
      <select className={inputClass} value={value.chambresMin ?? ''} onChange={(event) => set('chambresMin', numberValue(event.target.value))}>
        <option value="">Indifférent</option>
        {options?.chambres.map((nombre) => (
          <option key={nombre} value={nombre}>
            {nombre}+ chambre{nombre > 1 ? 's' : ''}
          </option>
        ))}
      </select>
    </Field>
  );
  const champLoyerMin = (
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
  );
  const champLoyerMax = (
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
  );
  const champSurface = (
    <Field label="Surface minimum (m²)">
      <input
        type="number"
        inputMode="numeric"
        min={0}
        step={5}
        className={inputClass}
        placeholder="Ex. 50"
        value={value.superficieMin ?? ''}
        onChange={(event) => set('superficieMin', numberValue(event.target.value))}
      />
    </Field>
  );
  const champMeuble = (
    <Field label="Ameublement">
      <select
        className={inputClass}
        value={value.meuble === undefined ? '' : String(value.meuble)}
        onChange={(event) => set('meuble', event.target.value === '' ? undefined : event.target.value === 'true')}
      >
        <option value="">Indifférent</option>
        <option value="true">Meublé</option>
        <option value="false">Non meublé</option>
      </select>
    </Field>
  );

  // Feuille mobile : tous les critères, dans l'ordre naturel du formulaire.
  if (sheet) {
    return (
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
        {champType}
        {champRegion}
        {champCommune}
        {champChambres}
        {champLoyerMin}
        {champLoyerMax}
        {champSurface}
        {champMeuble}
      </form>
    );
  }

  const peutEffacer = avances > 0 || [value.type, value.commune, value.chambresMin, value.loyerMax, value.search].some((c) => c !== undefined && c !== '');

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-mtm-border/70 bg-white p-5 shadow-[0_24px_60px_-28px_rgba(10,33,66,0.45)] sm:p-6"
    >
      {header && <div className="mb-4">{header}</div>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-mtm-muted" aria-hidden="true" />
          <input
            type="search"
            aria-label="Recherche libre"
            placeholder="Quartier, commune, mot-clé…"
            className="w-full rounded-xl border border-mtm-border bg-mtm-bg/60 py-3 pl-11 pr-11 text-[15px] text-mtm-text placeholder:text-mtm-muted focus:border-mtm-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-mtm-primary"
            value={value.search ?? ''}
            onChange={(event) => set('search', event.target.value || undefined)}
          />
          <MapPin className="pointer-events-none absolute right-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-mtm-primary/60" aria-hidden="true" />
        </div>
        <Button type="submit" className="shrink-0 px-8 py-3 text-[15px]">
          Rechercher
        </Button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {champType}
        {champCommune}
        {champChambres}
        {champLoyerMax}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          aria-expanded={ouvert}
          aria-controls="filtres-avances"
          onClick={() => setOuvert((etat) => !etat)}
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-mtm-primary hover:text-mtm-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-primary"
        >
          {ouvert ? 'Moins de filtres' : 'Plus de filtres'}
          {avances > 0 && !ouvert && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-mtm-primary px-1.5 text-[11px] font-bold text-white">{avances}</span>
          )}
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${ouvert ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {peutEffacer && onReset && (
          <button type="button" onClick={onReset} className="text-sm font-medium text-mtm-muted underline-offset-4 hover:text-mtm-accent hover:underline">
            Tout effacer
          </button>
        )}
      </div>

      {ouvert && (
        <div id="filtres-avances" className="mt-4 grid grid-cols-2 gap-4 border-t border-mtm-border pt-5 lg:grid-cols-4">
          {champRegion}
          {champLoyerMin}
          {champSurface}
          {champMeuble}
        </div>
      )}
    </form>
  );
}
