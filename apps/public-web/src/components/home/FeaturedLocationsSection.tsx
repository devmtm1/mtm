import { useMemo } from 'react';
import { Home, KeyRound } from 'lucide-react';
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

  // Aucune annonce à la une (ou API indisponible) : on ne montre pas de grille vide, mais la location reste mise en avant
  // par un bandeau qui mène à la page Locations.
  if (!loading && (error || items.length === 0)) return <BandeauLocations />;

  return (
    <section aria-label="Locations" className="bg-gradient-to-b from-mtm-primary-subtle/70 to-transparent">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:py-16">
        <div className="flex items-end justify-between gap-4">
          <SectionHeading
            eyebrow="Location"
            title="Locations à la une"
            description="Une sélection d'appartements, de villas et de studios gérés par MTM, prêts à accueillir leur prochain locataire."
          />
          <LinkButton to={ROUTES.locations} variant="accent" className="hidden shrink-0 sm:inline-flex">
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
                <LinkButton to={ROUTES.locations} variant="accent" className="w-full">
                  Toutes les locations
                </LinkButton>
              </div>
            </>
          )}
        </div>

        <ProprietaireInvitation />
      </div>
    </section>
  );
}

/** Du côté des propriétaires : la gestion locative alimente les locations, on y invite sans détour. */
function ProprietaireInvitation() {
  return (
    <div className="mt-8 flex flex-col items-start gap-3 rounded-2xl border border-mtm-border/70 bg-mtm-surface p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mtm-accent-subtle text-mtm-accent">
          <Home className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="font-display text-base font-bold text-mtm-text">Vous êtes propriétaire ?</p>
          <p className="text-sm text-mtm-muted">Confiez-nous la gestion de votre bien : locataires, loyers et suivi.</p>
        </div>
      </div>
      <LinkButton to={ROUTES.gestionLocative} variant="secondary" className="w-full shrink-0 sm:w-auto">
        Confier mon bien
      </LinkButton>
    </div>
  );
}

/** Quand aucune annonce n'est à la une : un appel à découvrir toutes les locations, plutôt que rien. */
function BandeauLocations() {
  return (
    <section aria-label="Nos locations" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="flex flex-col items-start gap-4 rounded-3xl bg-gradient-to-r from-mtm-primary-dark to-mtm-primary p-6 text-white shadow-card-hover sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15">
            <KeyRound className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-xl font-bold sm:text-2xl">Nos locations</h2>
            <p className="mt-1 max-w-xl text-sm text-white/85 sm:text-base">Appartements, villas et studios gérés par MTM : découvrez toutes les annonces disponibles.</p>
          </div>
        </div>
        <LinkButton to={ROUTES.locations} variant="accent" className="w-full shrink-0 sm:w-auto">
          Voir les locations
        </LinkButton>
      </div>
    </section>
  );
}
