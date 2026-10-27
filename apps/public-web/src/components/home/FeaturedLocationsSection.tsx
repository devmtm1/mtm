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
  // Seules les annonces mises à la une figurent ici ; les autres sont sur la page Locations.
  const filters = useMemo(() => ({ misEnAvant: true, pageSize: 6 }), []);
  const { data, loading, error } = useLocationsCatalog(filters);
  // Grille de 3 colonnes : on n'affiche que des rangées complètes, pour ne jamais laisser une carte seule sur la
  // dernière ligne (4 annonces → 3).
  const items = data ? data.items.slice(0, data.items.length < 3 ? data.items.length : data.items.length - (data.items.length % 3)) : [];

  if (!loading && (error || items.length === 0)) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:py-16">
      <div className="flex items-end justify-between gap-4">
        <SectionHeading
          eyebrow="À la une"
          title="Locations à la une"
          description="Une sélection d'appartements, de villas et de studios gérés par MTM, prêts à accueillir leur prochain locataire."
        />
        <LinkButton to={ROUTES.locations} variant="secondary" className="hidden shrink-0 sm:inline-flex">
          Toutes les locations
        </LinkButton>
      </div>

      <div className="mt-5 sm:mt-8">
        {loading && <CardGridSkeleton count={3} gridClassName={FEATURED_GRID} compact />}
        {!loading && items.length > 0 && (
          <>
            <Carousel
              ariaLabel="Locations à la une"
              itemClassName="w-[72%] sm:w-[46%] lg:w-auto"
              lgClassName="lg:grid lg:grid-cols-3 lg:gap-6"
            >
              {items.map((location) => (
                <LocationCard key={location.id} location={location} compact masquerALaUne />
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
