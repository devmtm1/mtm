import { useMemo, useState } from 'react';
import { ContactModal } from './components/contact/ContactModal';
import { FloatingWhatsApp } from './components/contact/FloatingWhatsApp';
import { Footer } from './components/layout/Footer';
import { Header } from './components/layout/Header';
import { HomePageSections } from './components/home/HomePageSections';
import { CatalogPage } from './components/home/CatalogPage';
import { TerrainDetailsPage } from './components/terrains/TerrainDetailsPage';
import type { Terrain } from './domain/terrains/types';
import { usePublicContent } from './hooks/usePublicContent';
import { useTerrainCatalog } from './hooks/useTerrainCatalog';

export function App() {
  const [filters, setFilters] = useState({
    region: 'Toutes les zones',
    type: 'Terrain à bâtir',
    budget: 'Tous les budgets',
    size: 'Toutes les superficies',
    legalStatus: 'Tous les statuts',
  });
  const [view, setView] = useState<'home' | 'catalog'>('home');
  const [contactTerrainId, setContactTerrainId] = useState<string | null>(null);
  const [selectedTerrain, setSelectedTerrain] = useState<Terrain | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const contentBlocks = usePublicContent();
  const { catalogue, visibleTerrains, hasMore, total, loadMore } =
    useTerrainCatalog(filters);
  const featuredTerrains = useMemo(() => {
    const featured = catalogue.filter((terrain) => terrain.misEnAvant);
    return featured.length ? featured.slice(0, 3) : catalogue.slice(0, 3);
  }, [catalogue]);

  const openContact = (terrainId?: string) => {
    setContactTerrainId(terrainId ?? null);
    setSelectedTerrain(null);
    setContactOpen(true);
  };
  const openTerrain = (terrain: Terrain) => setSelectedTerrain(terrain);
  const updateFilter = (key: keyof typeof filters) => (value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const goCatalog = () => {
    setView('catalog');
    window.scrollTo({ top: 0 });
  };
  const goHome = (hash?: string) => {
    setView('home');
    if (hash) {
      window.setTimeout(() => {
        document
          .querySelector(hash)
          ?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      window.scrollTo({ top: 0 });
    }
  };
  const navigate = (href: string) => {
    if (href === '#terrains') goCatalog();
    else goHome(href);
  };

  const onFilterChange = {
    region: updateFilter('region'),
    type: updateFilter('type'),
    budget: updateFilter('budget'),
    size: updateFilter('size'),
    legalStatus: updateFilter('legalStatus'),
  };

  if (selectedTerrain) {
    return (
      <div className="min-h-screen overflow-hidden bg-mist text-ink">
        <Header onContact={() => openContact(selectedTerrain.id)} onNavigate={navigate} />
        <TerrainDetailsPage
          terrain={selectedTerrain}
          onBack={() => setSelectedTerrain(null)}
          onContact={() => openContact(selectedTerrain.id)}
        />
        <Footer onNavigate={navigate} />
        <FloatingWhatsApp />
        {contactOpen && (
          <ContactModal
            terrainId={contactTerrainId}
            onClose={() => {
              setContactOpen(false);
              setContactTerrainId(null);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-mist text-ink">
      <Header onContact={() => openContact()} onNavigate={navigate} />
      <main>
        {view === 'catalog' ? (
          <CatalogPage
            filters={filters}
            onFilterChange={onFilterChange}
            terrains={visibleTerrains}
            hasMore={hasMore}
            total={total}
            onLoadMore={loadMore}
            onSelectTerrain={openTerrain}
            onContact={() => openContact()}
            onBack={() => goHome('#accueil')}
          />
        ) : (
          <HomePageSections
            contentBlocks={contentBlocks}
            featuredTerrains={featuredTerrains}
            filters={filters}
            onFilterChange={onFilterChange}
            onContact={() => openContact()}
            onSelectTerrain={openTerrain}
            onViewAll={goCatalog}
          />
        )}
      </main>
      <Footer onNavigate={navigate} />
      <FloatingWhatsApp />
      {contactOpen && (
        <ContactModal
          terrainId={contactTerrainId}
          onClose={() => {
            setContactOpen(false);
            setContactTerrainId(null);
          }}
        />
      )}
    </div>
  );
}
