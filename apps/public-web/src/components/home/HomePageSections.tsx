import type { Terrain } from '../../domain/terrains/types';
import { AboutSection } from './AboutSection';
import { ContactCtaSection } from './ContactCtaSection';
import { FeaturedTerrainsSection } from './FeaturedTerrainsSection';
import { HeroSection } from './HeroSection';
import { NewsSection } from './NewsSection';
import { ProjectsSection } from './ProjectsSection';
import { ServicesSection } from './ServicesSection';
import { TerrainSearchSection } from './TerrainSearchSection';
import { TestimonialsSection } from './TestimonialsSection';
import { WhyMtmSection } from './WhyMtmSection';

type HomePageSectionsProps = {
  contentBlocks: Record<string, string>;
  featuredTerrains: Terrain[];
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
  onContact: () => void;
  onSelectTerrain: (terrain: Terrain) => void;
  onViewAll: () => void;
  loading?: boolean;
  error?: string | null;
};

export function HomePageSections({
  contentBlocks,
  featuredTerrains,
  filters,
  onFilterChange,
  onContact,
  onSelectTerrain,
  onViewAll,
  loading = false,
  error = null,
}: Readonly<HomePageSectionsProps>) {
  return (
    <main>
      {loading && (
        <div className="mx-auto max-w-6xl px-5 py-8 text-sm text-slate-500">
          Chargement du catalogue et du contenu public…
        </div>
      )}
      {error && !loading && (
        <div className="mx-auto max-w-6xl px-5 pb-4 text-sm text-red-700">{error}</div>
      )}
      <HeroSection contentBlocks={contentBlocks} onContact={onContact} onViewAll={onViewAll} />
      <TerrainSearchSection
        filters={filters}
        onFilterChange={onFilterChange}
        onSearch={onViewAll}
      />
      <FeaturedTerrainsSection
        terrains={featuredTerrains}
        onSelect={onSelectTerrain}
        onViewAll={onViewAll}
      />
      <ServicesSection />
      <AboutSection contentBlocks={contentBlocks} onContact={onContact} />
      <ProjectsSection />
      <TestimonialsSection contentBlocks={contentBlocks} />
      <NewsSection contentBlocks={contentBlocks} />
      <WhyMtmSection onContact={onContact} />
      <ContactCtaSection onContact={onContact} />
    </main>
  );
}
