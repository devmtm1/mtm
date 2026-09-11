import type { FormEvent, ReactNode } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { TerrainFilters as TerrainFiltersValue } from '../../types/terrain';
import { useTerrainFilterOptions } from '../../hooks/useTerrainFilterOptions';
import { Button } from '../ui/Button';
import { ROUTES } from '../../routes';

interface TerrainFiltersProps {
  value: TerrainFiltersValue;
  onChange: (next: TerrainFiltersValue) => void;
  onSubmit?: () => void;
  /**
   * Mode « recherche rapide » (accueil) : seuls les 3 critères d'entrée les
   * plus courants sont affichés, avec un renvoi vers le catalogue pour les
   * filtres complets. Afficher les 8 champs dès l'accueil surchargeait la
   * page et masquait le contenu situé en dessous.
   */
  compact?: boolean;
}

const inputClass =
  'w-full rounded-md border border-mtm-border bg-white px-3 py-2 text-sm text-mtm-text placeholder:text-mtm-muted focus:border-mtm-primary focus:outline-none focus:ring-1 focus:ring-mtm-primary';
const labelClass = 'text-xs font-semibold text-mtm-muted';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

export function TerrainFilters({ value, onChange, onSubmit, compact = false }: TerrainFiltersProps) {
  // Les options viennent de l'API (statuts paramétrables en back-office,
  // zones et vocations dérivées des terrains publiés) — rien n'est figé
  // dans le front, conformément à la section 25 du CDC.
  const { data: options } = useTerrainFilterOptions();

  function set<K extends keyof TerrainFiltersValue>(key: K, next: TerrainFiltersValue[K]): void {
    onChange({ ...value, [key]: next, page: 1 });
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    onSubmit?.();
  }

  const numberValue = (next: string): number | undefined => (next ? Number(next) : undefined);

  const regionField = (
    <Field label="Région / zone">
      <select
        className={inputClass}
        value={value.region ?? ''}
        onChange={(event) => set('region', event.target.value || undefined)}
      >
        <option value="">Toutes les zones</option>
        {options?.region.map((region) => (
          <option key={region} value={region}>
            {region}
          </option>
        ))}
      </select>
    </Field>
  );

  const vocationField = (
    <Field label="Type de terrain">
      <select
        className={inputClass}
        value={value.vocation ?? ''}
        onChange={(event) => set('vocation', event.target.value || undefined)}
      >
        <option value="">Tous les types</option>
        {options?.vocation.map((vocation) => (
          <option key={vocation} value={vocation}>
            {vocation}
          </option>
        ))}
      </select>
    </Field>
  );

  const submitButton = (
    <div className="flex items-end">
      <Button type="submit" className="w-full">
        <Search className="h-4 w-4" aria-hidden="true" />
        Rechercher
      </Button>
    </div>
  );

  if (compact) {
    return (
      <form
        onSubmit={handleSubmit}
        aria-label="Recherche rapide de terrains"
        className="rounded-lg border border-mtm-border bg-mtm-surface p-4 shadow-card"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {regionField}
          {vocationField}
          <Field label="Budget maximum (FCFA)">
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="Ex. 10 000 000"
              className={inputClass}
              value={value.prixPublicMax ?? ''}
              onChange={(event) => set('prixPublicMax', numberValue(event.target.value))}
            />
          </Field>
          {submitButton}
        </div>

        <Link
          to={ROUTES.catalog}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-mtm-primary hover:underline"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Recherche avancée
        </Link>
      </form>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Filtres du catalogue"
      className="grid gap-3 rounded-lg border border-mtm-border bg-mtm-surface p-4 shadow-card sm:grid-cols-2 lg:grid-cols-4"
    >
      {regionField}

      <Field label="Commune">
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

      {vocationField}

      <Field label="Statut juridique">
        <select
          className={inputClass}
          value={value.statutJuridique ?? ''}
          onChange={(event) => set('statutJuridique', event.target.value || undefined)}
        >
          <option value="">Tous</option>
          {options?.statutJuridique.map((statut) => (
            <option key={statut} value={statut}>
              {statut}
            </option>
          ))}
        </select>
      </Field>

      <fieldset className="flex flex-col gap-1">
        <legend className={labelClass}>Superficie (m²)</legend>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            aria-label="Superficie minimum en m²"
            placeholder="Min"
            className={inputClass}
            value={value.superficieMin ?? ''}
            onChange={(event) => set('superficieMin', numberValue(event.target.value))}
          />
          <span className="text-mtm-muted">—</span>
          <input
            type="number"
            min={0}
            aria-label="Superficie maximum en m²"
            placeholder="Max"
            className={inputClass}
            value={value.superficieMax ?? ''}
            onChange={(event) => set('superficieMax', numberValue(event.target.value))}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1">
        <legend className={labelClass}>Budget (FCFA)</legend>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            aria-label="Budget minimum en FCFA"
            placeholder="Min"
            className={inputClass}
            value={value.prixPublicMin ?? ''}
            onChange={(event) => set('prixPublicMin', numberValue(event.target.value))}
          />
          <span className="text-mtm-muted">—</span>
          <input
            type="number"
            min={0}
            aria-label="Budget maximum en FCFA"
            placeholder="Max"
            className={inputClass}
            value={value.prixPublicMax ?? ''}
            onChange={(event) => set('prixPublicMax', numberValue(event.target.value))}
          />
        </div>
      </fieldset>

      <Field label="Recherche libre">
        <input
          type="text"
          className={inputClass}
          placeholder="Référence, nom, commune..."
          value={value.search ?? ''}
          onChange={(event) => set('search', event.target.value || undefined)}
        />
      </Field>

      {submitButton}
    </form>
  );
}
