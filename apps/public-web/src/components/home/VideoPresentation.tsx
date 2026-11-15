import { useState } from 'react';
import { Play } from 'lucide-react';
import type { SourceVideo } from '../../utils/video';

/**
 * Lecteur léger d'une vidéo (YouTube, Vimeo ou fichier). Au départ, seulement un bouton de lecture — avec la vignette pour
 * YouTube — ; la vidéo ne se charge qu'au clic : la page reste rapide, et personne ne télécharge un lecteur qu'il n'ouvrira pas.
 */
export function VideoPresentation({ video, titre }: { video: SourceVideo; titre: string }) {
  const [enLecture, setEnLecture] = useState(false);

  return (
    <div className="relative aspect-video overflow-hidden rounded-3xl bg-gradient-to-br from-mtm-primary-dark to-mtm-primary-medium shadow-card-hover ring-1 ring-mtm-border/60">
      {enLecture ? <Lecteur video={video} titre={titre} /> : (
        <button type="button" onClick={() => setEnLecture(true)} aria-label={`Lire la vidéo : ${titre}`} className="group absolute inset-0 block w-full">
          {video.type === 'youtube' && (
            <img
              src={`https://i.ytimg.com/vi/${video.id}/maxresdefault.jpg`}
              alt=""
              loading="lazy"
              decoding="async"
              onError={(event) => {
                const image = event.currentTarget;
                if (image.src.includes('maxresdefault')) image.src = image.src.replace('maxresdefault', 'hqdefault');
              }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          {video.type === 'fichier' && (
            // Une image du film en guise de vignette : le navigateur ne charge que les premières secondes, pas la vidéo entière.
            <video src={`${video.url}#t=0.5`} preload="metadata" muted playsInline aria-hidden="true" tabIndex={-1} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
          )}
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

function Lecteur({ video, titre }: { video: SourceVideo; titre: string }) {
  if (video.type === 'fichier') {
    return <video src={video.url} title={titre} controls autoPlay playsInline preload="metadata" className="absolute inset-0 h-full w-full bg-black" />;
  }
  const src =
    video.type === 'youtube'
      ? `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&playsinline=1`
      : `https://player.vimeo.com/video/${video.id}?autoplay=1&dnt=1`;
  return (
    <iframe
      title={titre}
      src={src}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      className="absolute inset-0 h-full w-full border-0"
    />
  );
}
