import { useHeroContent } from './hero-content';
import { HeroBackdrop } from './HeroBackdrop';
import { PromoBanner } from './PromoBanner';
import { useHeroPromotions } from '../../hooks/useHeroPromotions';

export function HeroSection() {
  const { title } = useHeroContent();
  const { promotions, loading } = useHeroPromotions();

  // Des publicités ou promotions sont en ligne : elles prennent la place de la
  // vidéo (et du texte du bandeau, qui masquerait les affiches). Le titre reste
  // dans la page pour les lecteurs d'écran et le référencement.
  if (promotions.length > 0) {
    return (
      <section className="relative">
        <h1 className="sr-only">{title}</h1>
        <PromoBanner promotions={promotions} variant="hero" />
      </section>
    );
  }

  // La vidéo est une affiche complète (titre, services, coordonnées) : on la montre en entier, sans texte ni voile par-dessus.
  // Le titre administrable reste dans la page pour les lecteurs d'écran et le référencement.
  return (
    <section className="relative bg-[#0b2349]" aria-label="Présentation de MTM Immobilier">
      <h1 className="sr-only">{title}</h1>
      <div className="relative mx-auto h-[min(56.25vw,calc(100dvh-4rem))] min-h-[16rem] w-full max-w-[120rem] overflow-hidden">
        <HeroBackdrop lecture={!loading} />
      </div>
    </section>
  );
}
