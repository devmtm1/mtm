import { useState } from 'react';
import type { FormEvent } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTerrainFilterOptions } from '../../hooks/useTerrainFilterOptions';
import { ROUTES } from '../../routes';

const MAX_ZONES = 5;

/**
 * Recherche en un champ, pour le hero sur mobile : où cherchez-vous ?
 * Les zones les plus courantes sont proposées en puces ; les critères
 * détaillés attendent dans les filtres du catalogue.
 */
export function HeroQuickSearch() {
  const navigate = useNavigate();
  const { data: options } = useTerrainFilterOptions();
  const [query, setQuery] = useState('');
  const zones = options?.region.slice(0, MAX_ZONES) ?? [];

  function go(params: Record<string, string>): void {
    const search = new URLSearchParams(params).toString();
    navigate(search ? `${ROUTES.catalog}?${search}` : ROUTES.catalog);
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const text = query.trim();
    go(text ? { search: text } : {});
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2.5" aria-label="Recherche rapide de terrains">
      <div className="flex overflow-hidden rounded-md bg-white shadow-card">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mtm-muted" aria-hidden="true" />
          <input
            type="search"
            aria-label="Où cherchez-vous ?"
            placeholder="Où cherchez-vous ? Zone, commune…"
            className="h-11 w-full bg-transparent pl-9 pr-2 text-sm text-mtm-text placeholder:text-mtm-muted focus:outline-none"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <button type="submit" className="shrink-0 bg-mtm-accent px-4 text-sm font-semibold text-white hover:bg-mtm-accent-dark">
          Chercher
        </button>
      </div>
      {zones.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Zones populaires">
          {zones.map((zone) => (
            <li key={zone}>
              <button
                type="button"
                onClick={() => go({ region: zone })}
                className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur hover:bg-white/20"
              >
                {zone}
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
