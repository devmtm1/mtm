import { ArrowRight } from 'lucide-react';
import type { Terrain } from '../../domain/terrains/types';
import { TerrainCard } from '../terrains/TerrainCard';

type TerrainCatalogSectionProps = {
  terrains: Terrain[];
  onSelect: (terrain: Terrain) => void;
  hasMore: boolean;
  total: number;
  onLoadMore: () => void;
};

export function TerrainCatalogSection({
  terrains,
  onSelect,
  hasMore,
  total,
  onLoadMore,
}: Readonly<TerrainCatalogSectionProps>) {
  return (
    <section
      id="terrains"
      className="reveal-section mx-auto max-w-7xl px-5 pb-24 pt-24 lg:px-10 lg:pt-32"
    >
      <div className="catalog-heading flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Catalogue</p>
          <h2 className="section-title">
            Tous nos terrains
            <br />
            <i>disponibles.</i>
          </h2>
        </div>
        {total > 0 && (
          <p className="self-start text-sm text-slate-500 sm:self-end">
            {total} terrain{total > 1 ? 's' : ''} au total
          </p>
        )}
      </div>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {terrains.map((terrain, index) => (
          <TerrainCard
            key={terrain.id}
            terrain={terrain}
            index={index}
            onSelect={onSelect}
          />
        ))}
      </div>
      {terrains.length === 0 && (
        <div className="catalog-empty">
          <p className="catalog-empty-title">Aucun terrain trouvé</p>
          <p>Modifiez vos critères de recherche pour voir d’autres opportunités.</p>
        </div>
      )}
      {hasMore && (
        <div className="mt-12 flex justify-center">
          <button type="button" className="catalog-more" onClick={onLoadMore}>
            Charger plus de terrains <ArrowRight size={16} />
          </button>
        </div>
      )}
    </section>
  );
}
