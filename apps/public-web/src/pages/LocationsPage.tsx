import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowUpDown, Building2, Search, SlidersHorizontal } from 'lucide-react';
import { BandeauPage, IMAGE_BANDEAU_PAGE } from '../components/layout/BandeauPage';
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
import { useEditableContent } from '../hooks/useEditableContent';
import { useLocationFilterOptions, useLocationsCatalog } from '../hooks/useLocations';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { ROUTES } from '../routes';
import { LOCATION_SORTS, sortKeyFrom, sortParams } from '../utils/locationFormat';
import type { Location, LocationFilters as LocationFiltersValue, LocationSortKey } from '../types/location';

// Relus depuis l'URL : un filtre absent d'ici serait écrit dans l'adresse sans
// jamais être rechargé, et disparaîtrait au premier aller-retour.
const TEXT_FILTERS = ['search', 'type', 'region', 'commune', 'mode'] as const;
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
  if (tri && LOCATION_SORTS.some((sort) => sort.key === tri)) Object.assign(filters, sortParams(tri, filters.mode));

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

const REASSURANCES_DEFAUT = ['Biens contrôlés par nos équipes', 'Loyer, charges et caution annoncés', 'Visite et suivi, même à distance'];

const INTRO_DEFAUT =
  'Appartements, villas, studios et bureaux gérés par MTM Immobilier. Comparez les loyers, regardez les photos et demandez une visite en quelques clics — même depuis l’étranger.';

export function LocationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetDraft, setSheetDraft] = useState<LocationFiltersValue>(filters);
  const { data, loading, error } = useLocationsCatalog(filters);
  const { data: options } = useLocationFilterOptions();
  const { text, lines, loading: contenuEnCours } = useEditableContent();
  // Le choix « Au mois / Courte durée » n'a de sens que s'il y a des annonces des deux sortes.
  const proposerModes = (options?.sejours ?? 0) > 0 && (options?.longueDuree ?? 0) > 0;

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
        className="rounded-md border border-mtm-border bg-mtm-surface px-2.5 py-1.5 max-lg:min-h-11 text-sm font-semibold text-mtm-text focus:border-mtm-primary focus:outline-none focus:ring-1 focus:ring-mtm-primary"
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

  // « Toutes / Au mois / Courte durée » : un sélecteur discret, au-dessus de la recherche.
  const modeSelect = proposerModes ? (
    <div role="group" aria-label="Type de location" className="inline-flex rounded-full bg-mtm-bg p-1">
      {[
        { value: undefined, label: 'Toutes' },
        { value: 'longue_duree', label: 'Au mois' },
        { value: 'courte_duree', label: 'Courte durée' },
      ].map(({ value, label }) => (
        <button
          key={label}
          type="button"
          aria-pressed={filters.mode === value}
          onClick={() =>
            commitFilters({ ...filters, mode: value, page: 1, ...(value === 'courte_duree' ? { loyerMin: undefined, loyerMax: undefined } : {}) })
          }
          className={`rounded-full px-4 py-1.5 max-lg:min-h-11 text-sm font-semibold transition-colors ${
            filters.mode === value ? 'bg-mtm-primary text-white shadow-sm' : 'text-mtm-muted hover:text-mtm-primary'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div>
      <BandeauPage
        vague="discrete"
        eyebrow={text('locations.eyebrow', 'Locations')}
        title={text('locations.title', 'Trouvez votre prochain logement au Sénégal')}
        description={text('locations.intro', INTRO_DEFAUT)}
        points={lines('locations.reassurance', REASSURANCES_DEFAUT)}
        image={text('locations.image', IMAGE_BANDEAU_PAGE)}
        chargement={contenuEnCours}
      />

      <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 sm:pb-14">
        {/* Le panneau de recherche chevauche le bandeau, comme les cartes de « Nos réalisations ». */}
        <div className="relative z-10 -mt-14 sm:-mt-16 lg:-mt-20">
          {/* Mobile : recherche + bouton Filtres, critères en feuille. */}
          <div className="rounded-2xl border border-mtm-border/70 bg-white p-3 shadow-[0_24px_60px_-28px_rgba(10,33,66,0.45)] lg:hidden">
            <div className="flex gap-2">
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
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-mtm-border bg-white px-3 py-2 text-sm font-semibold text-mtm-text hover:border-mtm-primary hover:text-mtm-primary"
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
            {modeSelect && <div className="mt-3">{modeSelect}</div>}
          </div>

          <div className="hidden lg:block">
            <LocationFilters
              value={draft}
              onChange={handleFiltersChange}
              onSubmit={() => commitFilters(draft)}
              onReset={() => commitFilters({})}
              header={modeSelect}
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-3 lg:mt-4">
            <ActiveFilterChips chips={chips} onRemove={removeChip} onClear={() => commitFilters({})} />
          </div>
        )}

        <div className="mt-6 sm:mt-8">
          <h2 className="sr-only">Annonces de location</h2>
          <div className="sticky top-16 z-20 -mx-4 mb-3 flex items-center justify-between gap-3 border-b border-mtm-border bg-mtm-bg/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:mb-4 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
            <p className="text-sm text-mtm-muted" aria-live="polite">
              {loading && !data ? (
                'Recherche…'
              ) : data ? (
                data.total === 0 ? (
                  'Aucune annonce'
                ) : (
                  <>
                    <strong className="font-display text-base font-bold text-mtm-primary-dark">{data.total}</strong>{' '}
                    {data.total === 1 ? 'annonce' : 'annonces'}
                  </>
                )
              ) : (
                ''
              )}
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
        <section className="mt-14 flex flex-col items-start gap-5 rounded-2xl border border-mtm-border bg-white p-6 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mtm-primary-subtle text-mtm-primary">
              <Building2 className="h-6 w-6" strokeWidth={1.7} aria-hidden="true" />
            </span>
            <div className="max-w-xl">
              <h2 className="font-display text-lg font-bold text-mtm-primary-dark">Vous avez un bien à louer ?</h2>
              <p className="mt-1 text-sm leading-relaxed text-mtm-muted">
                Confiez-le à MTM : recherche de locataires, encaissement des loyers, suivi et rapports réguliers,
                même depuis l’étranger.
              </p>
            </div>
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
