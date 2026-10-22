import { useState } from 'react';
import { PageIntro } from '../components/layout/PageIntro';
import { useContentBlocks } from '../hooks/useContentBlocks';
import { usePublications } from '../hooks/usePublications';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { ArticleListSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { FOCUS, LecteurVideo, VideoALaUne, VideoCarte } from '../components/actualites/VideoParts';
import type { Publication, RubriquePublication } from '../types/publication';
import { rubriquesPresentes, separerALaUne } from '../utils/publications';

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

      {enLecture && <LecteurVideo publication={enLecture} onClose={() => setEnLecture(null)} />}
    </div>
  );
}
