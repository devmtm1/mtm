import { Play } from 'lucide-react';
import { Badge } from '../ui/Badge';
import type { Publication } from '../../types/publication';
import { formatDate } from '../../utils/format';
import { etiquetteRubrique, formaterDureeLecteur } from '../../utils/publications';

export const FOCUS =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-primary';

/** Image de la vidéo + bouton lecture + durée. Sans image, un fond aux couleurs de la marque. */
export function Vignette({ publication, grande = false }: { publication: Publication; grande?: boolean }) {
  const duree = formaterDureeLecteur(publication.dureeSecondes);
  return (
    <>
      <span className="absolute inset-0 bg-gradient-to-br from-mtm-primary-dark to-mtm-primary-medium" aria-hidden="true" />
      {publication.posterUrl && (
        <img
          src={publication.posterUrl}
          alt=""
          loading={grande ? 'eager' : 'lazy'}
          decoding="async"
          // YouTube n'a pas toujours la version haute définition de l'image : on se rabat sur la standard.
          onError={(event) => {
            const image = event.currentTarget;
            if (image.src.includes('maxresdefault')) image.src = image.src.replace('maxresdefault', 'hqdefault');
          }}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      )}
      <span
        className={`absolute inset-0 flex items-center justify-center ${grande ? 'bg-gradient-to-t from-black/70 via-black/10 to-black/20 lg:bg-black/10 lg:bg-none' : 'bg-black/15'}`}
        aria-hidden="true"
      >
        <span
          className={`flex items-center justify-center rounded-full bg-white/95 text-mtm-primary shadow-lg transition-transform group-hover:scale-110 group-active:scale-95 ${grande ? 'h-16 w-16 sm:h-20 sm:w-20' : 'h-11 w-11 sm:h-14 sm:w-14'}`}
        >
          <Play className={grande ? 'ml-1 h-7 w-7 sm:h-9 sm:w-9' : 'ml-0.5 h-5 w-5 sm:h-6 sm:w-6'} fill="currentColor" />
        </span>
      </span>
      {duree && (
        <span className={`absolute ${grande ? 'right-2 top-2 lg:bottom-3 lg:right-3 lg:top-auto' : 'bottom-2 right-2'} rounded-md bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white sm:text-xs`}>
          {duree}
        </span>
      )}
    </>
  );
}

/** Vidéo à la une : grand format, titre posé sur l'image en mobile, texte à côté sur grand écran. */
export function VideoALaUne({ publication, onPlay }: { publication: Publication; onPlay: () => void }) {
  return (
    <article className="overflow-hidden rounded-2xl bg-mtm-surface shadow-card ring-1 ring-mtm-border lg:grid lg:grid-cols-5">
      <button
        type="button"
        onClick={onPlay}
        aria-label={`Lire la vidéo : ${publication.titre}`}
        className={`group relative block aspect-[4/3] w-full overflow-hidden sm:aspect-video lg:col-span-3 lg:aspect-auto lg:min-h-[22rem] ${FOCUS}`}
      >
        <Vignette publication={publication} grande />
        <span className="absolute inset-x-0 bottom-0 p-4 text-left lg:hidden">
          <span className="mb-2 inline-flex rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-mtm-primary">
            À la une · {etiquetteRubrique(publication.categorie)}
          </span>
          <span className="block font-display text-xl font-bold leading-snug text-white drop-shadow sm:text-2xl">
            {publication.titre}
          </span>
        </span>
      </button>
      <div className="p-5 sm:p-6 lg:col-span-2 lg:flex lg:flex-col lg:justify-center lg:p-9">
        <div className="mb-3 hidden items-center gap-2 lg:flex">
          <Badge tone="primary">À la une · {etiquetteRubrique(publication.categorie)}</Badge>
        </div>
        <h2 className="hidden font-display text-2xl font-bold leading-snug text-mtm-text lg:block">{publication.titre}</h2>
        {publication.resume && <p className="text-[15px] leading-relaxed text-mtm-muted lg:mt-3">{publication.resume}</p>}
        <p className="mt-3 text-xs text-mtm-muted">
          <time dateTime={publication.datePublication}>{formatDate(publication.datePublication)}</time>
        </p>
        <button
          type="button"
          onClick={onPlay}
          className={`mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-mtm-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-mtm-primary-dark active:scale-[0.98] sm:w-auto ${FOCUS}`}
        >
          <Play className="h-4 w-4" fill="currentColor" aria-hidden="true" />
          Regarder la vidéo
        </button>
      </div>
    </article>
  );
}

/** Carte de la grille : à gauche l'image et à droite le texte sur téléphone (liste compacte), empilées dès `sm`. */
export function VideoCarte({
  publication,
  onPlay,
  vertical = false,
}: {
  publication: Publication;
  onPlay: () => void;
  /** Carte toujours empilée (image au-dessus) : pour un carrousel, au lieu de la liste compacte du téléphone. */
  vertical?: boolean;
}) {
  return (
    <article className="overflow-hidden rounded-2xl bg-mtm-surface shadow-card ring-1 ring-mtm-border transition-shadow hover:shadow-lg">
      <button
        type="button"
        onClick={onPlay}
        aria-label={`Lire la vidéo : ${publication.titre}`}
        className={`group w-full text-left ${vertical ? 'block' : 'flex items-stretch sm:block'} ${FOCUS}`}
      >
        <span className={`relative block aspect-video shrink-0 overflow-hidden ${vertical ? 'w-full' : 'w-[42%] sm:w-full'}`}>
          <Vignette publication={publication} />
        </span>
        <span className={`flex min-w-0 flex-1 flex-col justify-center gap-1.5 ${vertical ? 'p-4' : 'p-3.5 sm:p-5'}`}>
          <span className="flex items-center gap-2">
            <Badge tone="primary">{etiquetteRubrique(publication.categorie)}</Badge>
            <time dateTime={publication.datePublication} className="hidden text-xs text-mtm-muted min-[400px]:inline">
              {formatDate(publication.datePublication)}
            </time>
          </span>
          <span className="line-clamp-3 font-display text-[15px] font-bold leading-snug text-mtm-text sm:text-base">
            {publication.titre}
          </span>
          {publication.resume && (
            <span className="hidden text-sm leading-relaxed text-mtm-muted sm:line-clamp-3 sm:block">{publication.resume}</span>
          )}
        </span>
      </button>
    </article>
  );
}
