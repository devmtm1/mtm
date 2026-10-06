import { useRef, useState } from 'react';
import type { ReactNode, TouchEvent } from 'react';
import { Play } from 'lucide-react';
import type { TerrainMedia } from '../../types/terrain';
import { MediaImage } from '../ui/MediaImage';

interface TerrainGalleryProps {
  medias: TerrainMedia[];
  alt: string;
  /** Classes du conteneur (ex. pleine largeur sur mobile). */
  className?: string;
  /** Actions posées sur la photo, en haut à droite (favori…). */
  overlay?: ReactNode;
}

/**
 * Galerie de la fiche. Sur mobile : photo pleine largeur qui se feuillette au
 * doigt, avec compteur et points ; sur ordinateur : photo et vignettes.
 */
export function TerrainGallery({ medias, alt, className = '', overlay }: TerrainGalleryProps) {
  const photosAndVideos = medias.filter((media) => media.type !== 'plan');
  const [activeId, setActiveId] = useState(photosAndVideos[0]?.id);
  const touchStartX = useRef<number | null>(null);
  const count = photosAndVideos.length;
  const activeIndex = Math.max(
    photosAndVideos.findIndex((media) => media.id === activeId),
    0,
  );
  const active = photosAndVideos[activeIndex];

  if (!active) {
    return (
      <div className={className}>
        <div className="flex aspect-[4/3] items-center justify-center bg-mtm-border/40 text-sm text-mtm-muted sm:aspect-video lg:rounded-lg lg:border lg:border-mtm-border">
          Aucun média disponible pour le moment
        </div>
      </div>
    );
  }

  const go = (delta: number) => {
    setActiveId(photosAndVideos[(activeIndex + delta + count) % count].id);
  };
  const swipe = {
    onTouchStart: (event: TouchEvent) => {
      touchStartX.current = event.touches[0].clientX;
    },
    onTouchEnd: (event: TouchEvent) => {
      if (touchStartX.current === null) return;
      const delta = event.changedTouches[0].clientX - touchStartX.current;
      touchStartX.current = null;
      if (count > 1 && Math.abs(delta) > 50) go(delta < 0 ? 1 : -1);
    },
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div
        className="relative aspect-[4/3] overflow-hidden bg-mtm-border/40 sm:aspect-video lg:rounded-lg lg:border lg:border-mtm-border"
        {...swipe}
      >
        {active.type === 'video' ? (
          <video src={active.secureUrl} controls className="h-full w-full object-cover" />
        ) : (
          <MediaImage
            src={active.secureUrl}
            alt={active.title ?? alt}
            loading="eager"
            sizes="(min-width: 1024px) 60vw, 100vw"
            fallbackLabel="Photo indisponible"
            className="h-full w-full object-cover"
          />
        )}

        {overlay && <div className="absolute right-3 top-3 z-10 flex gap-2">{overlay}</div>}

        {count > 1 && (
          <>
            <span className="pointer-events-none absolute bottom-9 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur lg:bottom-3">
              {activeIndex + 1} / {count}
            </span>
            <div className="pointer-events-none absolute inset-x-0 bottom-9 flex justify-center gap-1.5 lg:hidden" aria-hidden="true">
              {photosAndVideos.map((media, position) => (
                <span
                  key={media.id}
                  className={`h-1.5 rounded-full bg-white shadow-card transition-all ${position === activeIndex ? 'w-5' : 'w-1.5 opacity-60'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="hidden gap-2 overflow-x-auto pb-1 lg:flex">
          {photosAndVideos.map((media) => (
            <button
              key={media.id}
              type="button"
              onClick={() => setActiveId(media.id)}
              aria-label={media.title ?? 'Voir ce média'}
              className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                media.id === active.id ? 'border-mtm-primary' : 'border-transparent'
              }`}
            >
              {media.type === 'video' ? (
                // Une vignette <img> pointant sur un fichier vidéo ne s'affiche
                // pas : on rend un aperçu explicite avec une icône de lecture.
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
    </div>
  );
}
