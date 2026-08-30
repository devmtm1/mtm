import { ArrowLeft } from 'lucide-react';
import type { Terrain } from '../../domain/terrains/types';
import { TerrainCatalogSection } from './TerrainCatalogSection';
import { TerrainSearchSection } from './TerrainSearchSection';
import { MapView, type MapMarker } from '../map/MapView';

function toMapMarkers(terrains: Terrain[]): MapMarker[] {
  return terrains
    .filter(
      (terrain) =>
        Number.isFinite(Number(terrain.latitude)) &&
        Number.isFinite(Number(terrain.longitude)),
    )
    .map((terrain) => ({
      id: terrain.id,
      lat: Number(terrain.latitude),
      lng: Number(terrain.longitude),
      title: terrain.name,
      popupHtml: `<strong>${terrain.name}</strong><br/>${terrain.location}<br/><span class="mtm-map-popup-price">${terrain.price}</span>`,
    }));
}

type CatalogPageProps = {
  filters: {
    region: string;
    type: string;
    budget: string;
    size: string;
    legalStatus: string;
  };
  onFilterChange: {
    region: (value: string) => void;
    type: (value: string) => void;
    budget: (value: string) => void;
    size: (value: string) => void;
    legalStatus: (value: string) => void;
  };
  terrains: Terrain[];
  hasMore: boolean;
  total: number;
  onLoadMore: () => void;
  onSelectTerrain: (terrain: Terrain) => void;
  onContact: () => void;
  onBack: () => void;
};

export function CatalogPage({
  filters,
  onFilterChange,
  terrains,
  hasMore,
  total,
  onLoadMore,
  onSelectTerrain,
  onBack,
}: Readonly<CatalogPageProps>) {
  return (
    <main className="catalog-page">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 pt-28 lg:px-10 lg:pt-32">
        <button
          type="button"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-ink"
          onClick={onBack}
        >
          <ArrowLeft size={16} /> Retour à l'accueil
        </button>
        <p className="text-sm text-slate-500">
          {total} terrain{total > 1 ? 's' : ''} au total
        </p>
      </div>
      <TerrainSearchSection
        filters={filters}
        onFilterChange={onFilterChange}
        onSearch={() =>
          document
            .getElementById('terrains')
            ?.scrollIntoView({ behavior: 'smooth' })
        }
        overlap={false}
        hideHeading
      />
      {toMapMarkers(terrains).length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pb-4 lg:px-10">
          <p className="eyebrow">Carte des terrains</p>
          <h2 className="section-title-sm mb-4">Localisez nos terrains</h2>
          <MapView
            markers={toMapMarkers(terrains)}
            height={420}
            onMarkerClick={(id) => {
              const terrain = terrains.find((item) => item.id === id);
              if (terrain) onSelectTerrain(terrain);
            }}
          />
        </section>
      )}
      <TerrainCatalogSection
        terrains={terrains}
        onSelect={onSelectTerrain}
        hasMore={hasMore}
        total={total}
        onLoadMore={onLoadMore}
      />
    </main>
  );
}
