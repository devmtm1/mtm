import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowUpDown, Home, KeyRound, Search, ShieldCheck, SlidersHorizontal, Wallet } from 'lucide-react';
import { LocationFilters } from '../components/locations/LocationFilters';
import { LocationCard } from '../components/locations/LocationCard';
import { activeLocationChips, type LocationChip } from '../components/locations/location-filter-chips';
import { ActiveFilterChips } from '../components/terrains/ActiveFilterChips';
import { CATALOG_GRID } from '../components/terrains/terrain-grid';
import { CardGridSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { LinkButton } from '../components/ui/LinkButton';
import { Modal } from '../components/ui/Modal';
import { fieldInputClass } from '../components/ui/FormField';
import { useLocationsCatalog } from '../hooks/useLocations';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { ROUTES } from '../routes';
import { LOCATION_SORTS, sortKeyFrom, sortParams } from '../utils/locationFormat';
import type { Location, LocationFilters as LocationFiltersValue, LocationSortKey } from '../types/location';

// Relus depuis l'URL : un filtre absent d'ici serait écrit dans l'adresse sans
// jamais être rechargé, et disparaîtrait au premier aller-retour.
const TEXT_FILTERS = ['search', 'type', 'region', 'commune'] as const;
const NUMBER_FILTERS = ['loyerMin', 'loyerMax', 'chambresMin', 'superficieMin', 'page'] as const;
/** Champs saisis au clavier : appliqués après une courte pause. */
const TYPED_FILTERS = ['search', 'loyerMin', 'loyerMax', 'superficieMin'] as const;
const TYPING_DEBOUNCE_MS = 350;
const PAGE_SIZE = 12;

function parseFilters(params: URLSearchParams): LocationFiltersValue {
  const filters: LocationFiltersValue = {};
  for (const key of TEXT_FILTERS) {
    const value = params.get(key);
    if (value) filters[key] = value;
  }
  for (const key of NUMBER_FILTERS) {
    const value = params.get(key);
    if (value && !Number.isNaN(Number(value))) filters[key] = Number(value);
  }
  const meuble = params.get('meuble');
  if (meuble === 'true' || meuble === 'false') filters.meuble = meuble === 'true';

  const tri = params.get('tri') as LocationSortKey | null;
  if (tri && LOCATION_SORTS.some((sort) => sort.key === tri)) Object.assign(filters, sortParams(tri));

  filters.pageSize = PAGE_SIZE;
  return filters;
}

/** Clé des critères hors pagination : change ⇒ la liste repart de zéro. */
function criteriaKey(filters: LocationFiltersValue): string {
  const rest: Record<string, unknown> = { ...filters };
  delete rest.page;
  delete rest.pageSize;
  return JSON.stringify(rest);
}

const REASSURANCES = [
  { icon: ShieldCheck, label: 'Biens contrôlés par nos équipes' },
  { icon: Wallet, label: 'Loyer, charges et caution annoncés' },
  { icon: KeyRound, label: 'Visite et suivi, même à distance' },
];

export function LocationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetDraft, setSheetDraft] = useState<LocationFiltersValue>(filters);
  const { data, loading, error } = useLocationsCatalog(filters);

  usePageMetadata({
    title: 'Locations disponibles',
    description:
      'Appartements, villas, studios et bureaux à louer au Sénégal : filtrez par zone, loyer, nombre de chambres et demandez une visite en ligne.',
  });

  // Champs saisis au clavier : brouillon local puis application après une
  // pause, pour qu'une frappe ne déclenche ni appel API ni entrée d'historique.
  const [draft, setDraft] = useState<LocationFiltersValue>(filters);
  const debounceRef = useRef<number | null>(null);
  useEffect(() => setDraft(filters), [filters]);

  const sortKey = sortKeyFrom(filters);

  const commitFilters = useCallback(
    (next: LocationFiltersValue, tri?: LocationSortKey): void => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(next)) {
        if (value === undefined || value === '' || key === 'pageSize' || key === 'sortBy' || key === 'sortOrder') continue;
        params.set(key, String(value));
      }
      const triRetenu = tri ?? sortKeyFrom(next);
      if (triRetenu !== 'recent') params.set('tri', triRetenu);
      // `replace` : affiner une recherche ne doit pas empiler des entrées
      // d'historique que le bouton Retour devrait dérouler une à une.
      setSearchParams(params, { replace: true });
    },
    [setSearchParams],
  );

  useEffect(
    () => () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    },
    [],
  );

  function handleFiltersChange(next: LocationFiltersValue): void {
    setDraft(next);
    const typedChanged = TYPED_FILTERS.some((key) => next[key] !== draft[key]);
    if (!typedChanged) {
      commitFilters(next);
      return;
    }
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => commitFilters(next), TYPING_DEBOUNCE_MS);
  }

  // « Afficher plus » : les pages s'ajoutent à la suite. On ne réagit qu'à
  // l'arrivée de données, jamais au seul changement de filtres : entre les
  // deux, `data` est encore la réponse précédente et l'ajouter ferait
  // apparaître des doublons.
  const [accumulated, setAccumulated] = useState<{ key: string; page: number; items: Location[] }>({
    key: '',
    page: 0,
    items: [],
  });
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  useEffect(() => {
    if (!data) return;
    const key = criteriaKey(filtersRef.current);
    const page = filtersRef.current.page ?? 1;
    setAccumulated((previous) =>
      previous.key === key && page === previous.page + 1
        ? { key, page, items: [...previous.items, ...data.items] }
        : { key, page, items: data.items },
    );
  }, [data]);

  const currentPage = filters.page ?? 1;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const fresh = accumulated.key === criteriaKey(filters);
  const listItems = fresh ? accumulated.items : [];
  const loadingMore = loading && fresh && currentPage > 1;
  const loadingFresh = loading && !fresh;

  const chips = activeLocationChips(filters);
  const hasActiveFilters = chips.length > 0;
  const filterChipsCount = chips.filter((chip) => chip.key !== 'search').length;

  function removeChip(chip: LocationChip): void {
    const next = { ...filters, page: 1 };
    for (const key of chip.clears) delete next[key];
    commitFilters(next);
  }

  function openSheet(): void {
    setSheetDraft(filters);
    setSheetOpen(true);
  }

  function applySheet(): void {
    commitFilters({ ...sheetDraft, page: 1 });
    setSheetOpen(false);
  }

  const sortSelect = (
    <label className="inline-flex items-center gap-2 text-sm text-mtm-muted">
      <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only sm:not-sr-only">Trier par</span>
      <select
        className="rounded-md border border-mtm-border bg-mtm-surface px-2.5 py-1.5 text-sm font-semibold text-mtm-text focus:border-mtm-primary focus:outline-none focus:ring-1 focus:ring-mtm-primary"
        value={sortKey}
        onChange={(event) => commitFilters({ ...filters, page: 1 }, event.target.value as LocationSortKey)}
        aria-label="Trier les annonces"
      >
        {LOCATION_SORTS.map((sort) => (
          <option key={sort.key} value={sort.key}>
            {sort.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div>
      {/* Bandeau d'en-tête : la page se reconnaît d'un coup d'œil et dit tout
          de suite ce qu'on y trouve. */}
      <div className="relative overflow-hidden bg-gradient-to-br from-mtm-primary-dark via-mtm-primary to-mtm-primary-medium">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
            <Home className="h-3.5 w-3.5" aria-hidden="true" />
            Locations
          </span>
          <h1 className="mt-3 max-w-2xl font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
            Trouvez votre prochain logement au Sénégal
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/85 sm:text-base">
            Appartements, villas, studios et bureaux gérés par MTM Immobilier. Comparez les loyers, regardez les
            photos et demandez une visite en quelques clics — même depuis l’étranger.
          </p>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-white/90">
            {REASSURANCES.map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-2">
                <Icon className="h-4 w-4 text-white/80" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        {/* Mobile : recherche + bouton Filtres, critères en feuille. */}
        <div className="flex gap-2 lg:hidden">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mtm-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Recherche libre"
              placeholder="Quartier, commune, mot-clé…"
              className={`${fieldInputClass} pl-9`}
              value={draft.search ?? ''}
              onChange={(event) => handleFiltersChange({ ...draft, search: event.target.value || undefined, page: 1 })}
            />
          </div>
          <button
            type="button"
            onClick={openSheet}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-mtm-border bg-mtm-surface px-3 py-2 text-sm font-semibold text-mtm-text hover:border-mtm-primary hover:text-mtm-primary"
            aria-haspopup="dialog"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filtres
            {filterChipsCount > 0 && (
              <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-mtm-primary px-1.5 text-[11px] font-bold text-white">
                {filterChipsCount}
              </span>
            )}
          </button>
        </div>

        <div className="hidden lg:block">
          <LocationFilters value={draft} onChange={handleFiltersChange} onSubmit={() => commitFilters(draft)} />
        </div>

        {hasActiveFilters && (
          <div className="mt-3 lg:mt-4">
            <ActiveFilterChips chips={chips} onRemove={removeChip} onClear={() => commitFilters({})} />
          </div>
        )}

        <div className="mt-4 sm:mt-6">
          <div className="sticky top-16 z-20 -mx-4 mb-3 flex items-center justify-between gap-3 border-b border-mtm-border bg-mtm-bg/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:mb-4 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
            <p className="text-sm text-mtm-muted" aria-live="polite">
              {loading && !data
                ? 'Recherche…'
                : data
                  ? data.total === 0
                    ? 'Aucune annonce'
                    : data.total === 1
                      ? '1 annonce'
                      : `${data.total} annonces`
                  : ''}
            </p>
            {sortSelect}
          </div>

          {loadingFresh && <CardGridSkeleton count={8} gridClassName={CATALOG_GRID} compact />}
          {error && <EmptyState title="Impossible de charger les annonces" description={error} />}

          {!loading && !error && data && data.items.length === 0 && (
            <EmptyState
              title={hasActiveFilters ? 'Aucune annonce ne correspond à votre recherche' : 'Aucune location disponible pour le moment'}
              description={
                hasActiveFilters
                  ? 'Essayez d’élargir vos critères, ou dites-nous ce que vous cherchez : nous vous prévenons dès qu’un bien se libère.'
                  : 'De nouveaux biens sont publiés régulièrement. Dites-nous ce que vous cherchez : nous vous prévenons dès qu’un bien se libère.'
              }
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  {hasActiveFilters && (
                    <Button variant="secondary" onClick={() => commitFilters({})}>
                      Réinitialiser les filtres
                    </Button>
                  )}
                  <LinkButton to={ROUTES.contact}>Nous contacter</LinkButton>
                </div>
              }
            />
          )}

          {!error && data && data.items.length > 0 && fresh && (
            <>
              <div className={CATALOG_GRID}>
                {listItems.map((location) => (
                  <LocationCard key={location.id} location={location} compact />
                ))}
              </div>

              {currentPage < totalPages && (
                <div className="mt-8 flex flex-col items-center gap-2">
                  <Button
                    variant="secondary"
                    className="w-full sm:w-auto"
                    disabled={loadingMore}
                    onClick={() => commitFilters({ ...filters, page: currentPage + 1 })}
                  >
                    {loadingMore ? 'Chargement…' : 'Afficher plus d’annonces'}
                  </Button>
                  <p className="text-xs text-mtm-muted">
                    {listItems.length} sur {data.total}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Propriétaire : la même page recrute les biens de demain. */}
        <section className="mt-12 flex flex-col items-start gap-4 rounded-xl border border-mtm-border bg-mtm-surface p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <h2 className="font-display text-lg font-bold text-mtm-text">Vous avez un bien à louer ?</h2>
            <p className="mt-1 text-sm text-mtm-muted">
              Confiez-le à MTM : recherche de locataires, encaissement des loyers, suivi et rapports réguliers,
              même depuis l’étranger.
            </p>
          </div>
          <LinkButton to={ROUTES.gestionLocative} variant="secondary" className="shrink-0">
            Découvrir la gestion locative
          </LinkButton>
        </section>
      </div>

      {sheetOpen && (
        <Modal title="Filtrer les locations" onClose={() => setSheetOpen(false)}>
          <LocationFilters value={sheetDraft} onChange={setSheetDraft} onSubmit={applySheet} sheet />
          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-mtm-border pt-4">
            <Button variant="secondary" onClick={() => setSheetDraft({ search: sheetDraft.search, pageSize: PAGE_SIZE })}>
              Tout effacer
            </Button>
            <Button onClick={applySheet}>Appliquer</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
