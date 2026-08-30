import { ArrowRight } from 'lucide-react';
import type { Terrain } from '../../domain/terrains/types';
import { TerrainCard } from '../terrains/TerrainCard';

type FeaturedTerrainsSectionProps = {
  terrains: Terrain[];
  onSelect: (terrain: Terrain) => void;
  onViewAll: () => void;
};

export function FeaturedTerrainsSection({
  terrains,
  onSelect,
  onViewAll,
}: Readonly<FeaturedTerrainsSectionProps>) {
  if (!terrains.length) return null;

  return (
    <section
      id="terrains-mis-en-avant"
      className="reveal-section mx-auto max-w-7xl px-5 pb-12 pt-20 lg:px-10 lg:pt-24"
    >
      <div className="catalog-heading flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Mis en avant</p>
          <h2 className="section-title">
            Nos terrains
            <br />
            <i>à ne pas manquer.</i>
          </h2>
        </div>
        <button
          type="button"
          className="self-start border-b border-ink pb-1 text-sm font-bold transition hover:text-coral sm:self-end"
          onClick={onViewAll}
        >
          Voir tous les terrains{' '}
          <ArrowRight className="ml-2 inline" size={15} />
        </button>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {terrains.map((terrain, index) => (
          <TerrainCard
            key={terrain.id}
            terrain={terrain}
            index={index}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}
