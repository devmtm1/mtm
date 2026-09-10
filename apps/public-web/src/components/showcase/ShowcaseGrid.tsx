import type { ShowcaseCategory } from '../../types/showcase';
import { useShowcase } from '../../hooks/useShowcase';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { ShowcaseCard } from './ShowcaseCard';

interface ShowcaseGridProps {
  category: ShowcaseCategory;
  emptyLabel: string;
  limit?: number;
}

export function ShowcaseGrid({ category, emptyLabel, limit }: ShowcaseGridProps) {
  const { data, loading, error } = useShowcase(category);

  if (loading) return <Spinner label="Chargement..." />;
  if (error) return <EmptyState title="Impossible de charger le contenu" description={error} />;
  if (!data || data.length === 0) return <EmptyState title={emptyLabel} />;

  const items = limit ? data.slice(0, limit) : data;

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <ShowcaseCard key={item.id} item={item} />
      ))}
    </div>
  );
}
