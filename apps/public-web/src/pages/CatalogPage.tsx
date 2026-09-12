import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LayoutGrid, Map as MapIcon } from 'lucide-react';
import { TerrainFilters } from '../components/terrains/TerrainFilters';
import { TerrainCard } from '../components/terrains/TerrainCard';
import { TerrainsMap } from '../components/terrains/TerrainsMap';
import { CATALOG_GRID } from '../components/terrains/terrain-grid';
import { useTerrainsCatalog } from '../hooks/useTerrainsCatalog';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { CardGridSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { SectionHeading } from '../components/ui/SectionHeading';
import type { TerrainFilters as TerrainFiltersValue } from '../types/terrain';

const TEXT_FILTERS = ['search', 'region', 'commune', 'vocation', 'statutJuridique'] as const;
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

  filters.pageSize = 12;
  return filters;
}

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const [viewMode, setViewMode] = useState<'liste' | 'carte'>('liste');

  // En vue carte, la pagination n'a pas de sens : on charge l'ensemble des
  // terrains correspondant aux filtres pour tous les situer d'un coup.
  const queryFilters = useMemo(
    () => (viewMode === 'carte' ? { ...filters, page: 1, pageSize: 200 } : filters),
    [filters, viewMode],
  );
  const { data, loading, error } = useTerrainsCatalog(queryFilters);

  usePageMetadata({
    title: 'Nos terrains disponibles',
    description:
      'Catalogue de terrains vérifiés à vendre au Sénégal : filtrez par zone, commune, type, statut juridique, superficie et budget.',
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

  function goToPage(page: number): void {
    commitFilters({ ...filters, page });
  }

  const hasActiveFilters = Object.keys(filters).some((key) => key !== 'pageSize' && key !== 'page');
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const currentPage = filters.page ?? 1;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <SectionHeading
        eyebrow="Catalogue"
        title="Nos terrains disponibles"
        description="Filtrez par zone, type, superficie et budget pour trouver le terrain qui vous correspond."
      />

      <div className="mt-6">
        <TerrainFilters value={draft} onChange={handleFiltersChange} onSubmit={() => commitFilters(draft)} />
      </div>

      <div className="mt-8">
        {loading && <CardGridSkeleton count={8} gridClassName={CATALOG_GRID} compact />}
        {error && <EmptyState title="Impossible de charger les terrains" description={error} />}
        {!loading && !error && data && data.items.length === 0 && (
          <EmptyState
            title="Aucun terrain ne correspond à votre recherche"
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
        {!loading && !error && data && data.items.length > 0 && (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-mtm-muted" aria-live="polite">
                {data.total === 1 ? '1 terrain trouvé' : `${data.total} terrains trouvés`}
              </p>
              <div className="flex rounded-md border border-mtm-border bg-mtm-surface p-0.5" role="group" aria-label="Mode d'affichage">
                {(['liste', 'carte'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    aria-pressed={viewMode === mode}
                    className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-semibold capitalize transition-colors ${
                      viewMode === mode
                        ? 'bg-mtm-primary text-white'
                        : 'text-mtm-muted hover:text-mtm-primary'
                    }`}
                  >
                    {mode === 'liste' ? (
                      <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <MapIcon className="h-4 w-4" aria-hidden="true" />
                    )}
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {viewMode === 'liste' ? (
              <div className={CATALOG_GRID}>
                {data.items.map((terrain) => (
                  <TerrainCard key={terrain.id} terrain={terrain} compact />
                ))}
              </div>
            ) : (
              <TerrainsMap terrains={data.items} />
            )}

            {viewMode === 'liste' && totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-4">
                <Button
                  variant="secondary"
                  disabled={currentPage <= 1}
                  onClick={() => goToPage(currentPage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Précédent
                </Button>
                <span className="text-sm text-mtm-muted">
                  Page {currentPage} / {totalPages}
                </span>
                <Button
                  variant="secondary"
                  disabled={currentPage >= totalPages}
                  onClick={() => goToPage(currentPage + 1)}
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
