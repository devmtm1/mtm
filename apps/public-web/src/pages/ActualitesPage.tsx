import { PageIntro } from '../components/layout/PageIntro';
import { useContentBlocks } from '../hooks/useContentBlocks';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { ArticleListSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';

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
  const articles = data ? buildNewsItems(data) : [];

  usePageMetadata({
    title: 'Actualités et conseils',
    description: 'Conseils et actualités de MTM Immobilier pour investir sereinement dans l’immobilier au Sénégal.',
  });

  return (
    <div>
      <PageIntro
        eyebrow="Actualités"
        title="Actualités et conseils"
        description="Nos derniers conseils pour investir sereinement dans l'immobilier au Sénégal."
      />
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        {loading && <ArticleListSkeleton />}
        {error && <EmptyState title="Impossible de charger les actualités" description={error} />}
        {!loading && !error && articles.length === 0 && (
          <EmptyState title="Aucune actualité publiée pour le moment" />
        )}
        {!loading && !error && articles.length > 0 && (
          <div className="flex flex-col gap-4">
            {articles.map((article) => (
              <article
                key={article.index}
                className="rounded-lg border border-mtm-border bg-mtm-surface p-6 shadow-card"
              >
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
    </div>
  );
}
