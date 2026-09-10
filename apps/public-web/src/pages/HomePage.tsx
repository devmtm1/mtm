import { HeroSection } from '../components/home/HeroSection';
import { QuickSearchSection } from '../components/home/QuickSearchSection';
import { FeaturedTerrainsSection } from '../components/home/FeaturedTerrainsSection';
import { UpcomingProjectsSection } from '../components/home/UpcomingProjectsSection';
import { RealisationsPreviewSection } from '../components/home/RealisationsPreviewSection';
import { ServicesSection } from '../components/home/ServicesSection';
import { TestimonialsSection } from '../components/home/TestimonialsSection';
import { ContactCtaSection } from '../components/home/ContactCtaSection';

export function HomePage() {
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
