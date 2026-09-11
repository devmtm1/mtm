import { HeroSection } from '../components/home/HeroSection';
import { QuickSearchSection } from '../components/home/QuickSearchSection';
import { FeaturedTerrainsSection } from '../components/home/FeaturedTerrainsSection';
import { UpcomingProjectsSection } from '../components/home/UpcomingProjectsSection';
import { RealisationsPreviewSection } from '../components/home/RealisationsPreviewSection';
import { ServicesSection } from '../components/home/ServicesSection';
import { TestimonialsSection } from '../components/home/TestimonialsSection';
import { ContactCtaSection } from '../components/home/ContactCtaSection';
import { usePageMetadata } from '../hooks/usePageMetadata';

export function HomePage() {
  usePageMetadata({
    title: 'Terrains vérifiés, gestion locative et construction au Sénégal',
    description:
      "MTM Immobilier accompagne particuliers et diaspora dans l'achat de terrains vérifiés, la vérification foncière, la gestion locative et la construction au Sénégal.",
  });

  return (
    <>
      <HeroSection />
      <QuickSearchSection />
      <FeaturedTerrainsSection />
      <ServicesSection />
      <UpcomingProjectsSection />
      <RealisationsPreviewSection />
      <TestimonialsSection />
      <ContactCtaSection />
    </>
  );
}
