import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TerrainFilters } from '../components/terrains/TerrainFilters';
import { TerrainCard } from '../components/terrains/TerrainCard';
import { useTerrainsCatalog } from '../hooks/useTerrainsCatalog';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { SectionHeading } from '../components/ui/SectionHeading';
import type { TerrainFilters as TerrainFiltersValue } from '../types/terrain';

function parseFilters(params: URLSearchParams): TerrainFiltersValue {
  const filters: TerrainFiltersValue = {};
  const region = params.get('region');
  const commune = params.get('commune');
  const vocation = params.get('vocation');
  const statutJuridique = params.get('statutJuridique');
  const superficieMin = params.get('superficieMin');
  const prixPublicMax = params.get('prixPublicMax');
  const page = params.get('page');

  if (region) filters.region = region;
  if (commune) filters.commune = commune;
  if (vocation) filters.vocation = vocation;
  if (statutJuridique) filters.statutJuridique = statutJuridique;
  if (superficieMin) filters.superficieMin = Number(superficieMin);
  if (prixPublicMax) filters.prixPublicMax = Number(prixPublicMax);
  if (page) filters.page = Number(page);
  filters.pageSize = 12;
  return filters;
}

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const { data, loading, error } = useTerrainsCatalog(filters);

  function updateFilters(next: TerrainFiltersValue): void {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value !== undefined && value !== '' && key !== 'pageSize') params.set(key, String(value));
    }
    setSearchParams(params);
  }

  function goToPage(page: number): void {
    updateFilters({ ...filters, page });
  }

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
        <TerrainFilters value={filters} onChange={updateFilters} onSubmit={() => undefined} />
      </div>

      <div className="mt-8">
        {loading && <Spinner />}
        {error && <EmptyState title="Impossible de charger les terrains" description={error} />}
        {!loading && !error && data && data.items.length === 0 && (
          <EmptyState
            title="Aucun terrain ne correspond à votre recherche"
            description="Essayez d'élargir vos critères de filtre."
          />
        )}
        {!loading && !error && data && data.items.length > 0 && (
          <>
            <p className="mb-4 text-sm text-mtm-muted">{data.total} terrain(s) trouvé(s)</p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map((terrain) => (
                <TerrainCard key={terrain.id} terrain={terrain} />
              ))}
            </div>

            {totalPages > 1 && (
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
