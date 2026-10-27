import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, Map as MapIcon, Search, SlidersHorizontal } from 'lucide-react';
import { TerrainFilters } from '../components/terrains/TerrainFilters';
import { ActiveFilterChips } from '../components/terrains/ActiveFilterChips';
import { activeFilterChips, type FilterChip } from '../components/terrains/active-filter-chips';
import { TerrainCard } from '../components/terrains/TerrainCard';
import { CatalogStatutSwitch, type CatalogStatut } from '../components/terrains/CatalogStatutSwitch';
import { SoldPropertyCard } from '../components/terrains/SoldPropertyCard';
import { estVendu } from '../utils/venteLabels';
import { TerrainsMap } from '../components/terrains/TerrainsMap';
import { CATALOG_GRID } from '../components/terrains/terrain-grid';
import { useTerrainsCatalog } from '../hooks/useTerrainsCatalog';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { CardGridSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { BandeauLocations, IMAGE_BANDEAU_LOCATIONS } from '../components/locations/BandeauLocations';
import { useEditableContent } from '../hooks/useEditableContent';
import { fieldInputClass } from '../components/ui/FormField';
import type { Terrain, TerrainFilters as TerrainFiltersValue } from '../types/terrain';

// Relus depuis l'URL : un filtre absent d'ici est écrit dans l'adresse mais
// jamais rechargé — il disparaîtrait au premier aller-retour.
const TEXT_FILTERS = [
  'search',
  'typeBien',
  'nombrePieces',
  'region',
  'commune',
  'vocation',
  'statutJuridique',
] as const;
const NUMBER_FILTERS = [
  'superficieMin',
  'superficieMax',
  'prixPublicMin',
  'prixPublicMax',
  'page',
] as const;

/** Champs saisis au clavier, appliqués avec un délai (voir CatalogPage). */
const TYPED_FILTERS = ['search', 'superficieMin', 'superficieMax', 'prixPublicMin', 'prixPublicMax'] as const;
const TYPING_DEBOUNCE_MS = 350;
const PAGE_SIZE = 12;

const REASSURANCES_DEFAUT = ['Titres et documents vérifiés', 'Prix et surfaces annoncés', 'Visite et suivi, même à distance'];
const INTRO_DEFAUT =
  'Terrains, villas et appartements vérifiés à vendre, et nos références vendues : filtrez par type de bien, zone, superficie et budget.';

function parseFilters(params: URLSearchParams): TerrainFiltersValue {
  const filters: TerrainFiltersValue = {};

  for (const key of TEXT_FILTERS) {
    const value = params.get(key);
    if (value) filters[key] = value;
  }
  for (const key of NUMBER_FILTERS) {
    const value = params.get(key);
    if (value && !Number.isNaN(Number(value))) filters[key] = Number(value);
  }

  const statut = params.get('statut');
  if (statut === 'disponible' || statut === 'vendu') filters.statut = statut;

  filters.pageSize = PAGE_SIZE;
  return filters;
}

/** Clé des critères hors pagination : change ⇒ la liste repart de zéro. */
function criteriaKey(filters: TerrainFiltersValue): string {
  const rest: Record<string, unknown> = { ...filters };
  delete rest.page;
  delete rest.pageSize;
  return JSON.stringify(rest);
}

/**
 * Le catalogue : les biens à vendre, puis les références vendues que MTM a
 * choisi d'afficher (badge rouge « Vendu »), le tout dans la même liste.
 */
export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const [viewMode, setViewMode] = useState<'liste' | 'carte'>('liste');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetDraft, setSheetDraft] = useState<TerrainFiltersValue>(filters);

  // En vue carte, la pagination n'a pas de sens : on charge l'ensemble des
  // terrains correspondant aux filtres pour tous les situer d'un coup.
  const queryFilters = useMemo(
    () => ({
      ...(viewMode === 'carte' ? { ...filters, page: 1, pageSize: 200 } : filters),
      // Sans choix, le catalogue mêle les biens à vendre et les références vendues.
      statut: filters.statut ?? ('tous' as const),
    }),
    [filters, viewMode],
  );
  const { data, loading, error } = useTerrainsCatalog(queryFilters);
  const { text, lines, loading: contenuEnCours } = useEditableContent();

  usePageMetadata({
    title: 'Terrains et villas à vendre',
    description:
      'Catalogue de terrains et de villas vérifiés à vendre au Sénégal : filtrez par type de bien, zone, commune, statut juridique, superficie et budget.',
  });

  // Les champs saisis au clavier (recherche libre, min/max) passent par un
  // brouillon local puis sont appliqués après une courte pause : sans cela,
  // chaque frappe déclenchait un appel API et une entrée d'historique.
  // Les listes déroulantes, elles, s'appliquent immédiatement.
  const [draft, setDraft] = useState<TerrainFiltersValue>(filters);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const commitFilters = useCallback(
    (next: TerrainFiltersValue): void => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(next)) {
        if (value !== undefined && value !== '' && key !== 'pageSize') params.set(key, String(value));
      }
      // `replace` : affiner une recherche ne doit pas empiler des entrées
      // que le bouton Retour devrait ensuite dérouler une à une.
      setSearchParams(params, { replace: true });
    },
    [setSearchParams],
  );

  useEffect(() => () => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
  }, []);

  function handleFiltersChange(next: TerrainFiltersValue): void {
    setDraft(next);
    const typedFieldChanged = TYPED_FILTERS.some((key) => next[key] !== draft[key]);
    if (!typedFieldChanged) {
      commitFilters(next);
      return;
    }
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => commitFilters(next), TYPING_DEBOUNCE_MS);
  }

  // « Afficher plus » : les pages s'ajoutent à la suite au lieu de se
  // remplacer — plus naturel au pouce qu'une pagination, et sans surprise sur
  // ordinateur. Un changement de critères repart de la première page.
  //
  // On ne réagit qu'à l'arrivée de données (jamais au seul changement de
  // filtres) : entre les deux, `data` est encore la réponse précédente et
  // l'ajouter ferait apparaître des doublons. Les filtres ayant produit la
  // réponse sont lus dans une référence, à jour au moment où elle arrive.
  const [accumulated, setAccumulated] = useState<{ key: string; page: number; items: Terrain[] }>({ key: '', page: 0, items: [] });
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  useEffect(() => {
    if (!data || viewMode === 'carte') return;
    const key = criteriaKey(filtersRef.current);
    const page = filtersRef.current.page ?? 1;
    setAccumulated((previous) =>
      previous.key === key && page === previous.page + 1
        ? { key, page, items: [...previous.items, ...data.items] }
        : { key, page, items: data.items },
    );
  }, [data, viewMode]);

  const currentPage = filters.page ?? 1;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  // Liste « fraîche » = correspondant aux critères courants ; sinon on est en
  // train de charger de nouveaux critères et on montre des silhouettes.
  const fresh = accumulated.key === criteriaKey(filters);
  const listItems = fresh ? accumulated.items : [];
  const loadingMore = loading && fresh && currentPage > 1;
  const loadingFresh = loading && !fresh;

  const chips = activeFilterChips(filters);
  const hasActiveFilters = chips.length > 0;

  function removeChip(chip: FilterChip): void {
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

  const viewSwitch = (
    <div className="flex rounded-md border border-mtm-border bg-mtm-surface p-0.5" role="group" aria-label="Mode d'affichage">
      {(['liste', 'carte'] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => setViewMode(mode)}
          aria-pressed={viewMode === mode}
          className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-semibold capitalize transition-colors ${
            viewMode === mode ? 'bg-mtm-primary text-white' : 'text-mtm-muted hover:text-mtm-primary'
          }`}
        >
          {mode === 'liste' ? <LayoutGrid className="h-4 w-4" aria-hidden="true" /> : <MapIcon className="h-4 w-4" aria-hidden="true" />}
          {mode}
        </button>
      ))}
    </div>
  );

  const filterChipsCount = chips.filter((chip) => chip.key !== 'search').length;
  const statutSwitch = (
    <CatalogStatutSwitch
      className=""
      value={(filters.statut ?? 'tous') as CatalogStatut}
      onChange={(statut) => commitFilters({ ...filters, statut: statut === 'tous' ? undefined : statut, page: 1 })}
    />
  );

  return (
    <div>
      <BandeauLocations
        eyebrow={text('catalogue.eyebrow', 'Catalogue')}
        title={text('catalogue.title', 'Nos biens')}
        description={text('catalogue.intro', INTRO_DEFAUT)}
        points={lines('catalogue.reassurance', REASSURANCES_DEFAUT)}
        image={text('catalogue.image', IMAGE_BANDEAU_LOCATIONS)}
        chargement={contenuEnCours}
      />

      <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 sm:pb-14">
        {/* Le panneau de recherche chevauche le bandeau, comme sur « Locations » et « Nos réalisations ». */}
        <div className="relative z-10 -mt-14 sm:-mt-16 lg:-mt-20">
          {/* Mobile / tablette : recherche + bouton Filtres (critères en feuille).
              Les résultats sont visibles dès l'arrivée, sans traverser 7 champs. */}
          <div className="rounded-2xl border border-mtm-border/70 bg-white p-3 shadow-[0_24px_60px_-28px_rgba(10,33,66,0.45)] lg:hidden">
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mtm-muted" aria-hidden="true" />
                <input
                  type="search"
                  aria-label="Recherche libre"
                  placeholder="Chercher un bien…"
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
            <div className="mt-3 empty:hidden">{statutSwitch}</div>
          </div>

          {/* Ordinateur : recherche, quatre critères essentiels, le reste sous « Plus de filtres ». */}
          <div className="hidden lg:block">
            <TerrainFilters
              panel
              value={draft}
              onChange={handleFiltersChange}
              onSubmit={() => commitFilters(draft)}
              onReset={() => commitFilters({})}
              header={statutSwitch}
            />
          </div>
        </div>

      {hasActiveFilters && (
        <div className="mt-3 lg:mt-4">
          <ActiveFilterChips chips={chips} onRemove={removeChip} onClear={() => commitFilters({})} />
        </div>
      )}

      <div className="mt-4 sm:mt-6">
        {/* Barre de résultats collante : le compteur et la bascule Liste / Carte
            restent sous la main pendant le défilement. */}
        <div className="sticky top-16 z-20 -mx-4 mb-3 flex items-center justify-between gap-3 border-b border-mtm-border bg-mtm-bg/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:mb-4 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
          <p className="text-sm text-mtm-muted" aria-live="polite">
            {loading && !data
              ? 'Recherche…'
              : data
                ? data.total === 1
                  ? '1 bien trouvé'
                  : `${data.total} biens trouvés`
                : ''}
          </p>
          {viewSwitch}
        </div>

        {(loadingFresh || (loading && viewMode === 'carte')) && <CardGridSkeleton count={8} gridClassName={CATALOG_GRID} compact />}
        {error && <EmptyState title="Impossible de charger les biens" description={error} />}
        {!loading && !error && data && data.items.length === 0 && (
          <EmptyState
            title="Aucun bien ne correspond à votre recherche"
            description="Essayez d'élargir vos critères de filtre."
            action={
              hasActiveFilters ? (
                <Button variant="secondary" onClick={() => commitFilters({})}>
                  Réinitialiser les filtres
                </Button>
              ) : undefined
            }
          />
        )}
        {!error && data && data.items.length > 0 && (viewMode === 'carte' ? !loading : fresh) && (
          <>
            {viewMode === 'liste' ? (
              <div className={CATALOG_GRID}>
                {listItems.map((terrain) =>
                  estVendu(terrain) ? (
                    <SoldPropertyCard key={terrain.id} terrain={terrain} />
                  ) : (
                    <TerrainCard key={terrain.id} terrain={terrain} compact />
                  ),
                )}
              </div>
            ) : (
              <TerrainsMap terrains={data.items} />
            )}

            {viewMode === 'liste' && currentPage < totalPages && (
              <div className="mt-8 flex flex-col items-center gap-2">
                <Button variant="secondary" className="w-full sm:w-auto" disabled={loadingMore} onClick={() => commitFilters({ ...filters, page: currentPage + 1 })}>
                  {loadingMore ? 'Chargement…' : 'Afficher plus de biens'}
                </Button>
                <p className="text-xs text-mtm-muted">
                  {listItems.length} sur {data.total}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {sheetOpen && (
        <Modal title="Filtrer les biens" onClose={() => setSheetOpen(false)}>
          <TerrainFilters value={sheetDraft} onChange={setSheetDraft} onSubmit={applySheet} sheet />
          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-mtm-border pt-4">
            <Button variant="secondary" onClick={() => setSheetDraft({ search: sheetDraft.search, pageSize: PAGE_SIZE })}>
              Tout effacer
            </Button>
            <Button onClick={applySheet}>Appliquer</Button>
          </div>
        </Modal>
      )}
      </div>
    </div>
  );
}
