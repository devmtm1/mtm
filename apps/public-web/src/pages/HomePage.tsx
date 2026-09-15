import { HeroSection } from '../components/home/HeroSection';
import { QuickSearchSection } from '../components/home/QuickSearchSection';
import { FeaturedTerrainsSection } from '../components/home/FeaturedTerrainsSection';
import { UpcomingProjectsSection } from '../components/home/UpcomingProjectsSection';
import { RealisationsPreviewSection } from '../components/home/RealisationsPreviewSection';
import { ServicesSection } from '../components/home/ServicesSection';
import { TestimonialsSection } from '../components/home/TestimonialsSection';
import { ContactCtaSection } from '../components/home/ContactCtaSection';
import { TrustBand } from '../components/home/TrustBand';
import { HomeActionBar } from '../components/home/HomeActionBar';
import { usePageMetadata } from '../hooks/usePageMetadata';

export function HomePage() {
  usePageMetadata({
    title: 'Terrains vérifiés, gestion locative et construction au Sénégal',
    description:
      "MTM Immobilier accompagne particuliers et diaspora dans l'achat de terrains vérifiés, la vérification foncière, la gestion locative et la construction au Sénégal.",
  });

  return (
    // Marge basse sur mobile : la barre d'action fixe ne doit pas couvrir le
    // pied de page.
    <div className="pb-20 lg:pb-0">
      <HeroSection />
      {/* Grand écran : la recherche rapide chevauche le bas du hero, le
          bandeau de confiance vient ensuite ; mobile : bandeau sous le hero. */}
      <QuickSearchSection />
      <TrustBand />
      <FeaturedTerrainsSection />
      <ServicesSection />
      <UpcomingProjectsSection />
      <RealisationsPreviewSection />
      <TestimonialsSection />
      <ContactCtaSection />
      <HomeActionBar />
    </div>
  );
}
