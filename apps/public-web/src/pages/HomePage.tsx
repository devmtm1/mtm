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
import { Reveal } from '../components/ui/Reveal';
import { usePageMetadata } from '../hooks/usePageMetadata';

export function HomePage() {
  usePageMetadata({
    title: 'Terrains et villas vérifiés, gestion locative et construction au Sénégal',
    description:
      "MTM Immobilier accompagne particuliers et diaspora dans l'achat de terrains et de villas vérifiés, la vérification foncière, la gestion locative et la construction au Sénégal.",
  });

  return (
    // Marge basse sur mobile : la barre d'action fixe ne doit pas couvrir le
    // pied de page.
    <div className="pb-20 lg:pb-0">
      <HeroSection />
      {/* Grand écran : la recherche rapide chevauche le bas du hero, le
          bandeau de confiance vient ensuite ; mobile : bandeau sous le hero. */}
      <QuickSearchSection />
      {/* Le hero reste intact : l'animer retarderait le premier affichage,
          que le référencement mesure. Les sections suivantes, elles, se
          révèlent au défilement — c'est le seul mouvement qui existe aussi
          au doigt, là où le survol n'a aucun effet. */}
      <Reveal>
        <TrustBand />
      </Reveal>
      <Reveal>
        <FeaturedTerrainsSection />
      </Reveal>
      <Reveal>
        <ServicesSection />
      </Reveal>
      <Reveal>
        <UpcomingProjectsSection />
      </Reveal>
      <Reveal>
        <RealisationsPreviewSection />
      </Reveal>
      <Reveal>
        <TestimonialsSection />
      </Reveal>
      <Reveal>
        <ContactCtaSection />
      </Reveal>
      <HomeActionBar />
    </div>
  );
}
