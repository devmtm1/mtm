import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Expand, Play, X } from 'lucide-react';
import type { LocationMedia } from '../../types/location';
import { MediaImage } from '../ui/MediaImage';

interface LocationGalleryProps {
  medias: LocationMedia[];
  alt: string;
  /** Classes du conteneur (ex. pleine largeur sur mobile). */
  className?: string;
  /** Actions posées sur la photo, en haut à droite (favori…). */
  overlay?: ReactNode;
}

/**
 * Galerie de l'annonce : photo principale avec flèches, vignettes, et plein
 * écran au clic — un locataire juge un logement sur ses photos, elles doivent
 * pouvoir se regarder en grand, au clavier comme au doigt (flèches, Échap).
 */
export function LocationGallery({ medias, alt, className = '', overlay }: LocationGalleryProps) {
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);
  const count = medias.length;
  const active = medias[Math.min(index, Math.max(count - 1, 0))];

  const go = useCallback(
    (delta: number) => {
      if (count > 0) setIndex((current) => (current + delta + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullscreen(false);
      if (event.key === 'ArrowRight') go(1);
      if (event.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    // Le plein écran verrouille le défilement de la page derrière lui.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [fullscreen, go]);

  if (!active) {
    return (
      <div className={className}>
        <div className="flex aspect-[4/3] items-center justify-center bg-mtm-border/40 text-sm text-mtm-muted sm:aspect-[16/10] lg:rounded-xl lg:border lg:border-mtm-border">
          Les photos arrivent bientôt
        </div>
      </div>
    );
  }

  const swipe = {
    onTouchStart: (event: React.TouchEvent) => {
      touchStartX.current = event.touches[0].clientX;
    },
    onTouchEnd: (event: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const delta = event.changedTouches[0].clientX - touchStartX.current;
      touchStartX.current = null;
      if (Math.abs(delta) > 50) go(delta < 0 ? 1 : -1);
    },
  };

  const arrowClass =
    'absolute top-1/2 z-10 hidden h-10 w-10 lg:flex -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-mtm-text shadow-card transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-mtm-primary';

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div
        className="group relative aspect-[4/3] overflow-hidden bg-mtm-border/40 sm:aspect-[16/10] lg:rounded-xl lg:border lg:border-mtm-border"
        {...swipe}
      >
        {active.type === 'video' ? (
          <video src={active.secureUrl} controls className="h-full w-full object-cover" />
        ) : (
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="block h-full w-full cursor-zoom-in"
            aria-label="Voir la photo en plein écran"
          >
            <MediaImage
              src={active.secureUrl}
              alt={active.title ?? alt}
              loading="eager"
              sizes="(min-width: 1024px) 60vw, 100vw"
              fallbackLabel="Photo indisponible"
              className="h-full w-full object-cover"
            />
          </button>
        )}

        {count > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className={`${arrowClass} left-3`} aria-label="Photo précédente">
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => go(1)} className={`${arrowClass} right-3`} aria-label="Photo suivante">
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        )}

        {overlay && <div className="absolute right-3 top-3 z-10 flex gap-2">{overlay}</div>}

        {count > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-9 flex justify-center gap-1.5 lg:hidden" aria-hidden="true">
            {medias.map((media, position) => (
              <span
                key={media.id}
                className={`h-1.5 rounded-full bg-white shadow-card transition-all ${position === index ? 'w-5' : 'w-1.5 opacity-60'}`}
              />
            ))}
          </div>
        )}

        <div className="pointer-events-none absolute bottom-9 right-3 flex items-center gap-2 lg:bottom-3">
          <span className="rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            {index + 1} / {count}
          </span>
          {active.type !== 'video' && (
            <span className="rounded-full bg-black/60 p-1.5 text-white backdrop-blur" aria-hidden="true">
              <Expand className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>

      {count > 1 && (
        <div className="hidden gap-2 overflow-x-auto pb-1 lg:flex" role="tablist" aria-label="Photos du bien">
          {medias.map((media, position) => (
            <button
              key={media.id}
              type="button"
              role="tab"
              aria-selected={position === index}
              onClick={() => setIndex(position)}
              aria-label={media.title ?? `Photo ${position + 1}`}
              className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                position === index ? 'border-mtm-primary' : 'border-transparent opacity-75 hover:opacity-100'
              }`}
            >
              {media.type === 'video' ? (
                <span className="flex h-full w-full items-center justify-center bg-mtm-text/80 text-white">
                  <Play className="h-5 w-5" aria-hidden="true" />
                </span>
              ) : (
                <MediaImage
                  src={media.secureUrl}
                  alt=""
                  aria-hidden
                  compact
                  sizes="96px"
                  fallbackLabel="Photo indisponible"
                  className="h-full w-full object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}

      {fullscreen && active.type !== 'video' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Photos — ${alt}`}
          className="fixed inset-0 z-[60] flex flex-col bg-black/95"
          onClick={() => setFullscreen(false)}
          {...swipe}
        >
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="text-sm font-semibold">
              {index + 1} / {count}
            </span>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setFullscreen(false)}
              className="rounded-full bg-white/10 p-2 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              aria-label="Fermer le plein écran"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-6" onClick={(event) => event.stopPropagation()}>
            <MediaImage
              src={active.secureUrl}
              alt={active.title ?? alt}
              loading="eager"
              sizes="100vw"
              fallbackLabel="Photo indisponible"
              className="max-h-full max-w-full object-contain"
            />
            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white hover:bg-white/25"
                  aria-label="Photo précédente"
                >
                  <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white hover:bg-white/25"
                  aria-label="Photo suivante"
                >
                  <ChevronRight className="h-6 w-6" aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
