import { useMemo } from 'react';
import { useLocationsCatalog } from '../../hooks/useLocations';
import { LocationCard } from '../locations/LocationCard';
import { FEATURED_GRID } from '../terrains/terrain-grid';
import { SectionHeading } from '../ui/SectionHeading';
import { CardGridSkeleton } from '../ui/Skeleton';
import { LinkButton } from '../ui/LinkButton';
import { Carousel } from '../ui/Carousel';
import { ROUTES } from '../../routes';

/**
 * Locations à la une de l'accueil. La section disparaît entièrement quand il
 * n'y a rien à montrer (aucune annonce publiée, ou API indisponible) : un
 * encadré « aucune location » sur la page d'accueil nuirait plus qu'il
 * n'aiderait, la page Locations explique déjà l'absence d'annonces.
 */
export function FeaturedLocationsSection() {
  const filters = useMemo(() => ({ pageSize: 6 }), []);
  const { data, loading, error } = useLocationsCatalog(filters);

  if (!loading && (error || !data || data.items.length === 0)) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="flex items-end justify-between gap-4">
        <SectionHeading
          eyebrow="À louer"
          title="Locations disponibles"
          description="Appartements, villas et studios gérés par MTM, prêts à accueillir leur prochain locataire."
        />
        <LinkButton to={ROUTES.locations} variant="secondary" className="hidden shrink-0 sm:inline-flex">
          Toutes les locations
        </LinkButton>
      </div>

      <div className="mt-5 sm:mt-8">
        {loading && <CardGridSkeleton count={3} gridClassName={FEATURED_GRID} compact />}
        {!loading && data && data.items.length > 0 && (
          <>
            <Carousel
              ariaLabel="Locations disponibles"
              itemClassName="w-[72%] sm:w-[46%] lg:w-auto"
              lgClassName="lg:grid lg:grid-cols-3 lg:gap-6"
            >
              {data.items.map((location) => (
                <LocationCard key={location.id} location={location} compact />
              ))}
            </Carousel>
            <div className="mt-6 sm:hidden">
              <LinkButton to={ROUTES.locations} variant="secondary" className="w-full">
                Toutes les locations
              </LinkButton>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
