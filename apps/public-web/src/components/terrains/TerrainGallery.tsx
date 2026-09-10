import { useState } from 'react';
import type { TerrainMedia } from '../../types/terrain';

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
          <img src={active.secureUrl} alt={active.title ?? alt} className="h-full w-full object-cover" />
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
              className={`h-16 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                media.id === active.id ? 'border-mtm-primary' : 'border-transparent'
              }`}
            >
              <img
                src={media.secureUrl}
                alt=""
                aria-hidden="true"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
