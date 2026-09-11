import { useMemo } from 'react';
import { useTerrainsCatalog } from '../../hooks/useTerrainsCatalog';
import { TerrainCard } from '../terrains/TerrainCard';
import { SectionHeading } from '../ui/SectionHeading';
import { CardGridSkeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { LinkButton } from '../ui/LinkButton';
import { ROUTES } from '../../routes';

export function FeaturedTerrainsSection() {
  const filters = useMemo(() => ({ misEnAvant: true, pageSize: 6 }), []);
  const { data, loading, error } = useTerrainsCatalog(filters);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <SectionHeading
          eyebrow="Sélection MTM"
          title="Terrains mis en avant"
          description="Une sélection d'opportunités vérifiées, prêtes à la commercialisation."
        />
        <LinkButton to={ROUTES.catalog} variant="secondary">
          Voir tous les terrains
        </LinkButton>
      </div>

      <div className="mt-8">
        {loading && <CardGridSkeleton count={3} />}
        {error && <EmptyState title="Impossible de charger les terrains" description={error} />}
        {!loading && !error && data && data.items.length === 0 && (
          <EmptyState title="Aucun terrain mis en avant pour le moment" />
        )}
        {!loading && !error && data && data.items.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((terrain) => (
              <TerrainCard key={terrain.id} terrain={terrain} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
