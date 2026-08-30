import { ArrowRight } from 'lucide-react';
import { useParallax } from '../../hooks/useParallax';

type HeroSectionProps = {
  contentBlocks: Record<string, string>;
  onContact: () => void;
  onViewAll: () => void;
};

export function HeroSection({
  contentBlocks,
  onContact,
  onViewAll,
}: Readonly<HeroSectionProps>) {
  const parallaxOffset = useParallax();

  return (
    <section
      id="accueil"
      className="relative min-h-[590px] overflow-hidden bg-ink pt-32 text-white lg:min-h-[600px] lg:pt-36"
    >
      <div className="hero-media" style={{ transform: `translate3d(0, ${parallaxOffset}px, 0) scale(1.08)` }}>
        <video
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2200&q=90"
          aria-hidden="true"
          tabIndex={-1}
        >
          <source src={import.meta.env.VITE_HERO_VIDEO_URL ?? 'video.mp4'} type="video/mp4" />
        </video>
      </div>
      <div className="hero-overlay" />
      <div className="relative z-10 mx-auto max-w-7xl px-5 lg:px-10">
        <div className="max-w-2xl animate-fade-up">
          <p className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-[.24em] text-light">
            <span className="h-px w-8 bg-coral" /> L'immobilier autrement
          </p>
          <h1 className="font-display text-4xl leading-[.98] sm:text-5xl lg:text-6xl">
            {contentBlocks['home.hero.title']?.split('\n').map((line) => (
              <span key={line}>
                {line}
                <br />
              </span>
            )) ?? (
              <>
                Votre projet.
                <br />
                <span className="text-light">Notre engagement.</span>
              </>
            )}
          </h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-white/75 sm:text-lg">
            {contentBlocks['home.hero.subtitle'] ??
              'Terrains vérifiés, accompagnement transparent et solutions concrètes pour investir, construire et transmettre au Sénégal.'}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-full bg-coral px-6 py-3.5 text-sm font-bold text-white"
                onClick={onViewAll}
              >
                Découvrir nos terrains{' '}
                <ArrowRight className="ml-2 inline" size={16} />
              </button>
            <button
              type="button"
              className="rounded-full border border-white/35 px-6 py-3.5 text-sm font-bold"
              onClick={onContact}
            >
              Parler à un conseiller
            </button>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 z-10 h-24 bg-gradient-to-t from-[#f7f8fa] to-transparent" />
    </section>
  );
}
