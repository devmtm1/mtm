import { useMemo } from 'react';
import { useTerrainsCatalog } from '../../hooks/useTerrainsCatalog';
import { TerrainCard } from '../terrains/TerrainCard';
import { FEATURED_GRID } from '../terrains/terrain-grid';
import { SectionHeading } from '../ui/SectionHeading';
import { CardGridSkeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { LinkButton } from '../ui/LinkButton';
import { Carousel } from '../ui/Carousel';
import { ROUTES } from '../../routes';

export function FeaturedTerrainsSection() {
  const filters = useMemo(() => ({ misEnAvant: true, pageSize: 6 }), []);
  const { data, loading, error } = useTerrainsCatalog(filters);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="flex items-end justify-between gap-4">
        <SectionHeading
          eyebrow="Sélection MTM"
          title="Terrains mis en avant"
          description="Une sélection d'opportunités vérifiées, prêtes à la commercialisation."
        />
        <LinkButton to={ROUTES.catalog} variant="secondary" className="hidden shrink-0 sm:inline-flex">
          Voir tous les terrains
        </LinkButton>
      </div>

      <div className="mt-5 sm:mt-8">
        {loading && <CardGridSkeleton count={6} gridClassName={FEATURED_GRID} compact />}
        {error && <EmptyState title="Impossible de charger les terrains" description={error} />}
        {!loading && !error && data && data.items.length === 0 && (
          <EmptyState title="Aucun terrain mis en avant pour le moment" />
        )}
        {!loading && !error && data && data.items.length > 0 && (
          <>
            {/* Mobile : rangée à faire défiler (1,3 carte visible) ; grille dès lg. */}
            <Carousel ariaLabel="Terrains mis en avant" itemClassName="w-[72%] sm:w-[46%] lg:w-auto" lgClassName="lg:grid lg:grid-cols-3 lg:gap-6">
              {data.items.map((terrain) => (
                <TerrainCard key={terrain.id} terrain={terrain} compact />
              ))}
            </Carousel>
          </>
        )}
      </div>
    </section>
  );
}
