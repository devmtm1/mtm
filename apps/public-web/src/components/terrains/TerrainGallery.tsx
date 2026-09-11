import { useState } from 'react';
import { Play } from 'lucide-react';
import type { TerrainMedia } from '../../types/terrain';
import { MediaImage } from '../ui/MediaImage';

export function TerrainGallery({ medias, alt }: { medias: TerrainMedia[]; alt: string }) {
  const photosAndVideos = medias.filter((media) => media.type !== 'plan');
  const [activeId, setActiveId] = useState(photosAndVideos[0]?.id);
  const active = photosAndVideos.find((media) => media.id === activeId) ?? photosAndVideos[0];

  if (!active) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg border border-mtm-border bg-mtm-border/40 text-sm text-mtm-muted">
        Aucun média disponible pour le moment
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-video overflow-hidden rounded-lg border border-mtm-border bg-mtm-border/40">
        {active.type === 'video' ? (
          <video src={active.secureUrl} controls className="h-full w-full object-cover" />
        ) : (
          <MediaImage
            src={active.secureUrl}
            alt={active.title ?? alt}
            loading="eager"
            fallbackLabel="Photo indisponible"
            className="h-full w-full object-cover"
          />
        )}
      </div>

      {photosAndVideos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
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
