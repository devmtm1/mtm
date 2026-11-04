import { useMemo } from 'react';
import { useTerrainsCatalog } from '../../hooks/useTerrainsCatalog';
import { useProgrammes } from '../../hooks/useProgrammes';
import { ProgrammeCard } from '../programmes/ProgrammeCard';
import { SEUIL_SECTION_PROGRAMMES } from '../../utils/programmes';
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
  // Sous trois lotissements publiés, ils n'ont pas de section à part : leurs cartes ouvrent la rangée des biens en vedette.
  const { data: tousProgrammes } = useProgrammes({});
  const programmes = (tousProgrammes ?? []).length < SEUIL_SECTION_PROGRAMMES ? (tousProgrammes ?? []) : [];
  // Grille de 3 colonnes : on n'affiche que des rangées complètes, pour ne
  // jamais laisser une carte seule sur la dernière ligne (4 biens → 3). Les lotissements comptent dans la rangée.
  const total = data ? data.items.length + programmes.length : 0;
  const gardes = total < 3 ? total : total - (total % 3);
  const items = data ? data.items.slice(0, Math.max(0, gardes - programmes.length)) : [];
  const programmesAffiches = programmes.slice(0, gardes);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:py-16">
      <div className="flex items-end justify-between gap-4">
        <SectionHeading
          eyebrow="Sélection MTM"
          title="Biens en vedette"
          description="Une sélection d'opportunités vérifiées, prêtes à la commercialisation."
        />
        <LinkButton to={ROUTES.catalog} variant="secondary" className="hidden shrink-0 sm:inline-flex">
          Voir tous nos biens
        </LinkButton>
      </div>

      <div className="mt-5 sm:mt-8">
        {loading && <CardGridSkeleton count={6} gridClassName={FEATURED_GRID} compact />}
        {error && <EmptyState title="Impossible de charger les biens" description={error} />}
        {!loading && !error && data && data.items.length === 0 && programmes.length === 0 && (
          <EmptyState title="Aucun bien en vedette pour le moment" />
        )}
        {!loading && !error && (items.length > 0 || programmesAffiches.length > 0) && (
          <>
            {/* Mobile : rangée à faire défiler (1,3 carte visible) ; grille dès lg. */}
            <Carousel ariaLabel="Biens en vedette" itemClassName="w-[72%] sm:w-[46%] lg:w-auto" lgClassName="lg:grid lg:grid-cols-3 lg:gap-6">
              {programmesAffiches.map((programme) => (
                <ProgrammeCard key={programme.id} programme={programme} compact />
              ))}
              {items.map((terrain) => (
                <TerrainCard key={terrain.id} terrain={terrain} compact masquerMisEnAvant />
              ))}
            </Carousel>
          </>
        )}
      </div>
    </section>
  );
}
