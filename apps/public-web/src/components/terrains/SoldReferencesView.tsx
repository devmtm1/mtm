import { useMemo } from 'react';
import { useTerrainsCatalog } from '../../hooks/useTerrainsCatalog';
import { usePageMetadata } from '../../hooks/usePageMetadata';
import { CardGridSkeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { LinkButton } from '../ui/LinkButton';
import { SectionHeading } from '../ui/SectionHeading';
import { ROUTES } from '../../routes';
import { CatalogTabs } from './CatalogTabs';
import { SoldPropertyCard } from './SoldPropertyCard';
import { CATALOG_GRID } from './terrain-grid';

/** Les références vendues que MTM affiche, sous l'onglet « Vendus » du catalogue. */
export function SoldReferencesView() {
  const filters = useMemo(() => ({ statut: 'vendu' as const, pageSize: 48 }), []);
  const { data, loading, error } = useTerrainsCatalog(filters);
  usePageMetadata({
    title: 'Nos références vendues',
    description: 'Des terrains et villas vendus par MTM Immobilier : la preuve par les résultats.',
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <SectionHeading
        eyebrow="Références"
        title="Nos biens vendus"
        description="Quelques-uns des terrains et villas que nous avons vendus. Les prix ne sont pas publiés."
      />
      <CatalogTabs active="vendu" />

      <div className="mt-5 sm:mt-8">
        {loading && <CardGridSkeleton count={6} gridClassName={CATALOG_GRID} compact />}
        {error && <EmptyState title="Impossible de charger les références" description={error} />}
        {!loading && !error && data && data.items.length === 0 && (
          <EmptyState
            title="Aucune référence à afficher pour le moment"
            action={<LinkButton to={ROUTES.catalog}>Voir les biens à vendre</LinkButton>}
          />
        )}
        {!loading && !error && data && data.items.length > 0 && (
          <ul className={CATALOG_GRID}>
            {data.items.map((terrain) => (
              <li key={terrain.id}>
                <SoldPropertyCard terrain={terrain} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
