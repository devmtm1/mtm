import { useState } from 'react';
import { ExternalLink, Play } from 'lucide-react';
import { PageIntro } from '../components/layout/PageIntro';
import { useContentBlocks } from '../hooks/useContentBlocks';
import { usePublications } from '../hooks/usePublications';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { ArticleListSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import type { Publication, RubriquePublication } from '../types/publication';
import { formatDate } from '../utils/format';
import { etiquetteRubrique, formaterDureeLecteur, rubriquesPresentes, separerALaUne } from '../utils/publications';

interface NewsItem {
  index: number;
  title: string;
  tag?: string;
  excerpt?: string;
}

const NEWS_TITLE_PATTERN = /^news\.(\d+)\.title$/;

function buildNewsItems(blocks: { key: string; content: string }[]): NewsItem[] {
  const byKey = new Map(blocks.map((block) => [block.key, block.content]));
  const indices = blocks
    .map((block) => NEWS_TITLE_PATTERN.exec(block.key)?.[1])
    .filter((value): value is string => Boolean(value))
    .map(Number)
    .sort((a, b) => a - b);

  return indices.map((index) => ({
    index,
    title: byKey.get(`news.${index}.title`) ?? '',
    tag: byKey.get(`news.${index}.tag`),
    excerpt: byKey.get(`news.${index}.excerpt`),
  }));
}

const FOCUS =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-primary';

/** Image de la vidéo + bouton lecture + durée. Sans image, un fond aux couleurs de la marque. */
function Vignette({ publication, grande = false }: { publication: Publication; grande?: boolean }) {
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
function VideoALaUne({ publication, onPlay }: { publication: Publication; onPlay: () => void }) {
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
function VideoCarte({ publication, onPlay }: { publication: Publication; onPlay: () => void }) {
  return (
    <article className="overflow-hidden rounded-2xl bg-mtm-surface shadow-card ring-1 ring-mtm-border transition-shadow hover:shadow-lg">
      <button
        type="button"
        onClick={onPlay}
        aria-label={`Lire la vidéo : ${publication.titre}`}
        className={`group flex w-full items-stretch text-left sm:block ${FOCUS}`}
      >
        <span className="relative block aspect-video w-[42%] shrink-0 overflow-hidden sm:w-full">
          <Vignette publication={publication} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 p-3.5 sm:p-5">
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

export function ActualitesPage() {
  const { data, loading, error } = useContentBlocks();
  const { publications, loading: videosLoading } = usePublications();
  const [rubrique, setRubrique] = useState<RubriquePublication | null>(null);
  const [enLecture, setEnLecture] = useState<Publication | null>(null);
  // Les articles de texte ne servent que de repli : dès qu'il y a des vidéos, elles seules font la page.
  const articles = data ? buildNewsItems(data) : [];

  usePageMetadata({
    title: 'Actualités et conseils',
    description: 'Vidéos, conseils et actualités de MTM Immobilier pour acheter, construire et investir sereinement au Sénégal.',
  });

  const rubriques = rubriquesPresentes(publications);
  const visibles = rubrique ? publications.filter((publication) => publication.categorie === rubrique) : publications;
  const { aLaUne, autres } = separerALaUne(visibles);
  const aDesVideos = publications.length > 0;

  return (
    <div>
      <PageIntro
        eyebrow="Actualités"
        title="Actualités et conseils"
        description="Nos vidéos et conseils pour acheter, construire et investir sereinement dans l'immobilier au Sénégal."
      />

      {aDesVideos && (
        <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12" aria-label="Vidéos">
          {rubriques.length > 1 && (
            <div
              className="-mx-4 mb-5 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:mb-7 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
              role="group"
              aria-label="Filtrer par rubrique"
            >
              {[{ code: null, label: 'Toutes' }, ...rubriques].map((choix) => {
                const actif = rubrique === choix.code;
                return (
                  <button
                    key={choix.label}
                    type="button"
                    aria-pressed={actif}
                    onClick={() => setRubrique(choix.code)}
                    className={`min-h-11 shrink-0 snap-start rounded-full border px-5 text-sm font-semibold transition-colors active:scale-95 ${FOCUS} ${
                      actif
                        ? 'border-mtm-primary bg-mtm-primary text-white shadow-sm'
                        : 'border-mtm-border bg-mtm-surface text-mtm-text hover:border-mtm-primary'
                    }`}
                  >
                    {choix.label}
                  </button>
                );
              })}
            </div>
          )}
          {aLaUne && (
            <div className="flex flex-col gap-5 sm:gap-7">
              <VideoALaUne publication={aLaUne} onPlay={() => setEnLecture(aLaUne)} />
              {autres.length > 0 && (
                <>
                  <h2 className="font-display text-lg font-bold text-mtm-text sm:text-xl">Toutes les vidéos</h2>
                  <div className="-mt-2 grid gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                    {autres.map((publication) => (
                      <VideoCarte key={publication.id} publication={publication} onPlay={() => setEnLecture(publication)} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      )}

      <section className={`mx-auto max-w-3xl px-4 sm:px-6 ${aDesVideos ? "pb-14 sm:pb-20" : "py-12 sm:py-14"}`}>
        {(loading || (videosLoading && !aDesVideos)) && <ArticleListSkeleton />}
        {error && !aDesVideos && <EmptyState title="Impossible de charger les actualités" description={error} />}
        {!loading && !videosLoading && !error && articles.length === 0 && !aDesVideos && (
          <EmptyState title="Aucune actualité publiée pour le moment" />
        )}
        {!loading && !error && !aDesVideos && articles.length > 0 && (
          <div className="flex flex-col gap-4">
            {articles.map((article) => (
              <article key={article.index} className="rounded-2xl border border-mtm-border bg-mtm-surface p-5 shadow-card sm:p-6">
                {article.tag && (
                  <div className="mb-2">
                    <Badge tone="primary">{article.tag}</Badge>
                  </div>
                )}
                <h2 className="font-display text-lg font-bold text-mtm-text">{article.title}</h2>
                {article.excerpt && <p className="mt-2 text-sm text-mtm-muted">{article.excerpt}</p>}
              </article>
            ))}
          </div>
        )}
      </section>

      {enLecture && (
        <Modal title={enLecture.titre} large onClose={() => setEnLecture(null)}>
          {enLecture.youtubeId ? (
            <iframe
              key={enLecture.id}
              title={enLecture.titre}
              src={`https://www.youtube-nocookie.com/embed/${enLecture.youtubeId}?autoplay=1&rel=0&playsinline=1`}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="-mx-5 aspect-video w-[calc(100%+2.5rem)] max-w-none border-0 bg-black sm:mx-0 sm:w-full sm:max-w-full sm:rounded-lg"
            />
          ) : (
            <video
              key={enLecture.id}
              src={enLecture.videoUrl ?? undefined}
              poster={enLecture.posterUrl ?? undefined}
              controls
              autoPlay
              playsInline
              preload="metadata"
              controlsList="nodownload"
              className="-mx-5 w-[calc(100%+2.5rem)] max-w-none bg-black sm:mx-0 sm:w-full sm:max-w-full sm:rounded-lg"
              style={{ maxHeight: '70dvh' }}
            />
          )}
          {enLecture.youtubeId && (
            <a
              href={`https://www.youtube.com/watch?v=${enLecture.youtubeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-mtm-primary underline-offset-4 hover:underline ${FOCUS}`}
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Voir sur YouTube
            </a>
          )}
          <div className="mt-4 flex items-center gap-2">
            <Badge tone="primary">{etiquetteRubrique(enLecture.categorie)}</Badge>
            <time dateTime={enLecture.datePublication} className="text-xs text-mtm-muted">
              {formatDate(enLecture.datePublication)}
            </time>
          </div>
          {enLecture.resume && <p className="mt-3 text-[15px] leading-relaxed text-mtm-muted">{enLecture.resume}</p>}
        </Modal>
      )}
    </div>
  );
}
