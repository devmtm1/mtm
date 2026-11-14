import { useState, type FormEvent } from 'react';
import { KeyRound, MapPin, Search, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TerrainFilters } from '../terrains/TerrainFilters';
import { Button } from '../ui/Button';
import { useLocationFilterOptions } from '../../hooks/useLocations';
import type { TerrainFilters as TerrainFiltersValue } from '../../types/terrain';
import { typeBienLabel } from '../../utils/bienLabels';
import { ROUTES } from '../../routes';

type Onglet = 'louer' | 'acheter';

const champ =
  'w-full rounded-xl border border-mtm-border bg-mtm-bg/60 py-3 pl-11 pr-3 text-[15px] text-mtm-text placeholder:text-mtm-muted focus:border-mtm-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-mtm-primary';

/** Recherche rapide de l'accueil (ordinateur) : louer d'abord, puis acheter. Les deux mènent aux pages de résultats habituelles. */
export function QuickSearchSection() {
  const navigate = useNavigate();
  const [onglet, setOnglet] = useState<Onglet>('louer');
  const [filters, setFilters] = useState<TerrainFiltersValue>({});
  const [recherche, setRecherche] = useState('');
  const [type, setType] = useState('');
  const { data: options } = useLocationFilterOptions();

  function acheter(): void {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== '') params.set(key, String(value));
    }
    const query = params.toString();
    navigate(query ? `${ROUTES.catalog}?${query}` : ROUTES.catalog);
  }

  function louer(event: FormEvent): void {
    event.preventDefault();
    const params = new URLSearchParams();
    if (recherche.trim()) params.set('search', recherche.trim());
    if (type) params.set('type', type);
    const query = params.toString();
    navigate(query ? `${ROUTES.locations}?${query}` : ROUTES.locations);
  }

  const classeOnglet = (actif: boolean) =>
    `inline-flex items-center gap-2 rounded-t-xl px-5 py-2.5 text-sm font-bold transition-colors ${
      actif ? 'bg-mtm-surface text-mtm-accent shadow-[0_-6px_16px_-10px_rgba(10,33,66,0.4)]' : 'bg-white/70 text-mtm-primary-dark hover:bg-white'
    }`;

  return (
    <section className="relative z-10 mx-auto -mt-14 hidden max-w-6xl px-4 sm:px-6 lg:block" aria-label="Recherche rapide">
      <div role="tablist" aria-label="Que cherchez-vous ?" className="flex gap-1.5 px-2">
        <button type="button" role="tab" id="onglet-louer" aria-selected={onglet === 'louer'} aria-controls="panneau-recherche" onClick={() => setOnglet('louer')} className={classeOnglet(onglet === 'louer')}>
          <KeyRound className="h-4 w-4" aria-hidden="true" />
          Louer
        </button>
        <button type="button" role="tab" id="onglet-acheter" aria-selected={onglet === 'acheter'} aria-controls="panneau-recherche" onClick={() => setOnglet('acheter')} className={classeOnglet(onglet === 'acheter')}>
          <Tag className="h-4 w-4" aria-hidden="true" />
          Acheter
        </button>
      </div>

      <div id="panneau-recherche" role="tabpanel" aria-labelledby={onglet === 'louer' ? 'onglet-louer' : 'onglet-acheter'}>
        {onglet === 'acheter' ? (
          <TerrainFilters value={filters} onChange={setFilters} onSubmit={acheter} compact />
        ) : (
          <form onSubmit={louer} className="flex flex-col gap-3 rounded-2xl rounded-tl-none border border-mtm-border/70 bg-white p-5 shadow-[0_24px_60px_-28px_rgba(10,33,66,0.45)] sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <MapPin className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-mtm-primary/60" aria-hidden="true" />
              <input type="search" aria-label="Où souhaitez-vous louer ?" placeholder="Quartier, commune, mot-clé…" className={champ} value={recherche} onChange={(event) => setRecherche(event.target.value)} />
            </div>
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-mtm-primary/60" aria-hidden="true" />
              <select aria-label="Type de bien" className={champ} value={type} onChange={(event) => setType(event.target.value)}>
                <option value="">Tous les biens</option>
                {options?.type.map((valeur) => (
                  <option key={valeur} value={valeur}>
                    {typeBienLabel(valeur)}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="accent" className="shrink-0 px-8 py-3 text-[15px]">
              Voir les locations
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
