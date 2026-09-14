import type { ShowcaseCategory } from '../../types/showcase';
import { useShowcase } from '../../hooks/useShowcase';
import { CardGridSkeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { ShowcaseCard } from './ShowcaseCard';

interface ShowcaseGridProps {
  category: ShowcaseCategory;
  emptyLabel: string;
  limit?: number;
  /** 4 colonnes sur les pages de liste, 3 sur l'accueil. */
  columns?: 3 | 4;
}

const GRID: Record<3 | 4, string> = {
  3: 'grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3',
  4: 'grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4',
};

export function ShowcaseGrid({ category, emptyLabel, limit, columns = 3 }: ShowcaseGridProps) {
  const { data, loading, error } = useShowcase(category);

  if (loading) return <CardGridSkeleton variant="showcase" count={limit ?? 4} gridClassName={GRID[columns]} compact />;
  if (error) return <EmptyState title="Impossible de charger le contenu" description={error} />;
  if (!data || data.length === 0) return <EmptyState title={emptyLabel} />;

  const items = limit ? data.slice(0, limit) : data;

  return (
    <div className={GRID[columns]}>
      {items.map((item) => (
        <ShowcaseCard key={item.id} item={item} />
      ))}
    </div>
  );
}
