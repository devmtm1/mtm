import { useState } from 'react';
import { Play } from 'lucide-react';

/**
 * Lecteur léger d'une vidéo YouTube : au départ, seulement sa vignette et un bouton de lecture ; la vidéo ne se charge qu'au
 * clic. La page reste rapide, et personne ne télécharge un lecteur qu'il n'ouvrira pas.
 */
export function VideoPresentation({ videoId, titre }: { videoId: string; titre: string }) {
  const [enLecture, setEnLecture] = useState(false);

  return (
    <div className="relative aspect-video overflow-hidden rounded-3xl bg-gradient-to-br from-mtm-primary-dark to-mtm-primary-medium shadow-card-hover ring-1 ring-mtm-border/60">
      {enLecture ? (
        <iframe
          title={titre}
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <button type="button" onClick={() => setEnLecture(true)} aria-label={`Lire la vidéo : ${titre}`} className="group absolute inset-0 block w-full">
          <img
            src={`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`}
            alt=""
            loading="lazy"
            decoding="async"
            onError={(event) => {
              const image = event.currentTarget;
              if (image.src.includes('maxresdefault')) image.src = image.src.replace('maxresdefault', 'hqdefault');
            }}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
          <span aria-hidden="true" className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-mtm-accent text-white shadow-card-hover ring-4 ring-white/70 transition-transform duration-200 group-hover:scale-110">
            <Play className="ml-1 h-9 w-9" fill="currentColor" />
          </span>
          <span className="absolute inset-x-0 bottom-0 px-5 pb-4 text-left font-display text-lg font-bold text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.5)]">{titre}</span>
        </button>
      )}
    </div>
  );
}
