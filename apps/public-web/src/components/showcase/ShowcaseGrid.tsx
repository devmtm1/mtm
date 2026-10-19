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
  /**
   * Grand écran : la première carte occupe deux colonnes et deux rangées, les
   * suivantes s'empilent à côté. Varie la mise en page de l'accueil, où les
   * sections en trois cartes égales se suivaient.
   */
  mosaic?: boolean;
}

const GRID: Record<3 | 4, string> = {
  3: 'grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3',
  4: 'grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4',
};

export function ShowcaseGrid({ category, emptyLabel, limit, columns = 3, mobileCarousel = false, mosaic = false }: ShowcaseGridProps) {
  const { data, loading, error } = useShowcase(category);

  if (loading) return <CardGridSkeleton variant="showcase" count={limit ?? 4} gridClassName={GRID[columns]} compact />;
  if (error) return <EmptyState title="Impossible de charger le contenu" description={error} />;
  if (!data || data.length === 0) return <EmptyState title={emptyLabel} />;

  const items = limit ? data.slice(0, limit) : data;
  // La mosaïque n'a de sens qu'avec ses trois cartes (une grande, deux petites).
  const enMosaique = mosaic && items.length === 3;

  if (mobileCarousel) {
    return (
      <Carousel
        ariaLabel={category === 'projet_a_venir' ? 'Projets à venir' : 'Nos réalisations'}
        itemClassName="w-[72%] sm:w-[46%] lg:w-auto"
        dotsOnly
        lgClassName={`lg:grid lg:gap-5 ${columns === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} ${
          enMosaique ? 'lg:[&>*:first-child]:col-span-2 lg:[&>*:first-child]:row-span-2' : ''
        }`}
      >
        {items.map((item, index) => (
          <ShowcaseCard key={item.id} item={item} layout={enMosaique ? (index === 0 ? 'featured' : 'row') : 'default'} />
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
