import { useEffect, useState } from 'react';
import { ROUTES } from '../../routes';
import { LinkButton } from '../ui/LinkButton';
import { useContentBlocks } from '../../hooks/useContentBlocks';

const DEFAULT_TITLE = 'Investissez en toute confiance, où que vous soyez';
const DEFAULT_SUBTITLE =
  "MTM Immobilier accompagne particuliers et membres de la diaspora dans l'achat de terrains, la vérification foncière, la gestion locative et la construction — avec transparence et suivi à distance.";
const DEFAULT_CTA = 'Voir les terrains';

/**
 * La vidéo de fond (~18 Mo) n'est chargée que sur grand écran et hors
 * préférence "mouvement réduit" — pour ne pas pénaliser le mobile/la 4G
 * ni les utilisateurs sensibles aux animations.
 */
function useShouldPlayBackgroundVideo(): boolean {
  const [shouldPlay, setShouldPlay] = useState(false);

  useEffect(() => {
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setShouldPlay(isDesktop && !prefersReducedMotion);
  }, []);

  return shouldPlay;
}

export function HeroSection() {
  const { data } = useContentBlocks();
  const playVideo = useShouldPlayBackgroundVideo();

  const findContent = (key: string): string | undefined =>
    data?.find((block) => block.key === key)?.content;

  const title = findContent('home.hero.title') ?? DEFAULT_TITLE;
  const subtitle = findContent('home.hero.subtitle') ?? DEFAULT_SUBTITLE;
  const ctaLabel = findContent('home.cta.title') ?? DEFAULT_CTA;

  return (
    <section className="relative overflow-hidden bg-mtm-primary-dark">
      {/* Image fixe extraite de la vidéo : fond immédiat sur tous les écrans
          (pas d'aplat de couleur pendant le chargement, ni sur mobile où la
          vidéo n'est pas chargée), et `poster` de la vidéo sur grand écran. */}
      <img
        src="/hero-poster.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
        fetchPriority="high"
      />
      {playVideo && (
        <video
          className="absolute inset-0 h-full w-full object-cover motion-safe:animate-fade-in"
          src="/video.mp4"
          poster="/hero-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        />
      )}
      {/* Voile sombre neutre : il garantit le contraste du texte blanc sans
          teinter l'image. Une couche de marque très légère par-dessus
          conserve l'identité MTM — un aplat rouge opaque, lui, délavait
          complètement le visuel. Plus dense sur mobile où le texte couvre
          toute la largeur. */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/60 to-black/70 sm:bg-gradient-to-r sm:from-black/80 sm:via-black/55 sm:to-black/25"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-mtm-primary-dark/20 mix-blend-multiply" aria-hidden="true" />
      <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-20 sm:px-6 sm:py-28">
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
          Terrains · Gestion locative · Construction
        </span>
        <h1 className="max-w-2xl whitespace-pre-line font-display text-3xl font-bold text-white sm:text-4xl md:text-5xl">
          {title}
        </h1>
        <p className="max-w-xl text-base text-white/80 sm:text-lg">{subtitle}</p>
        <div className="flex flex-wrap gap-3">
          <LinkButton to={ROUTES.catalog} variant="onDark">
            {ctaLabel}
          </LinkButton>
          <LinkButton to={ROUTES.demarches} variant="onDarkOutline">
            Demander une vérification
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
