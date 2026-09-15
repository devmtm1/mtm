import type { ShowcaseCategory } from '../../types/showcase';
import { useShowcase } from '../../hooks/useShowcase';
import { CardGridSkeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { ShowcaseCard } from './ShowcaseCard';
import { Carousel } from '../ui/Carousel';

interface ShowcaseGridProps {
  category: ShowcaseCategory;
  emptyLabel: string;
  limit?: number;
  /** 4 colonnes sur les pages de liste, 3 sur l'accueil. */
  columns?: 3 | 4;
  /** Accueil : rangée à faire défiler sur mobile, grille dès lg. */
  mobileCarousel?: boolean;
}

const GRID: Record<3 | 4, string> = {
  3: 'grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3',
  4: 'grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4',
};

export function ShowcaseGrid({ category, emptyLabel, limit, columns = 3, mobileCarousel = false }: ShowcaseGridProps) {
  const { data, loading, error } = useShowcase(category);

  if (loading) return <CardGridSkeleton variant="showcase" count={limit ?? 4} gridClassName={GRID[columns]} compact />;
  if (error) return <EmptyState title="Impossible de charger le contenu" description={error} />;
  if (!data || data.length === 0) return <EmptyState title={emptyLabel} />;

  const items = limit ? data.slice(0, limit) : data;

  if (mobileCarousel) {
    return (
      <Carousel
        ariaLabel={category === 'projet_a_venir' ? 'Projets à venir' : 'Nos réalisations'}
        itemClassName="w-[72%] sm:w-[46%] lg:w-auto"
        lgClassName={`lg:grid lg:gap-5 ${columns === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}
      >
        {items.map((item) => (
          <ShowcaseCard key={item.id} item={item} />
        ))}
      </Carousel>
    );
  }

  return (
    <div className={GRID[columns]}>
      {items.map((item) => (
        <ShowcaseCard key={item.id} item={item} />
      ))}
    </div>
  );
}
