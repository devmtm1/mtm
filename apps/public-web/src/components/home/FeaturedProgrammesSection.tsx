import { useProgrammes } from '../../hooks/useProgrammes';
import { ProgrammeCard } from '../programmes/ProgrammeCard';
import { SectionHeading } from '../ui/SectionHeading';
import { SeeAllLink } from '../ui/SeeAllLink';
import { Carousel } from '../ui/Carousel';
import { ROUTES } from '../../routes';
import { SEUIL_SECTION_PROGRAMMES } from '../../utils/programmes';

/**
 * « Lotissements en cours » : les programmes qui ont encore des lots à vendre. Rien n'apparaît quand il n'y en a
 * pas : une section vide sur l'accueil ferait plus de tort qu'une section absente. Sur le site, la section n'existe qu'à
 * partir de trois lotissements ; en dessous, ils sont dans « Biens en vedette », sur le site comme sur l'accueil mobile.
 */
export function FeaturedProgrammesSection() {
  const { data } = useProgrammes({});
  const programmes = (data ?? []).slice(0, 6);
  if (programmes.length < Math.max(1, SEUIL_SECTION_PROGRAMMES)) return null;

  return (
    <section aria-label="Lotissements en cours" className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-10 lg:py-14">
      <div className="flex items-end justify-between gap-4">
        <SectionHeading
          app
          eyebrow="Lotissements"
          title="Choisissez votre lot"
          description="Des terrains viabilisés vendus en lots, au même endroit, avec un titre contrôlé. Voyez ce qu’il reste."
        />
        <SeeAllLink to={ROUTES.catalog} />
      </div>
      <div className="mt-3 sm:mt-8">
        {/* Mobile : rangée à faire défiler ; grille de trois colonnes dès lg. */}
        <Carousel ariaLabel="Lotissements en cours" itemClassName="w-[72%] sm:w-[46%] lg:w-auto" lgClassName="lg:grid lg:grid-cols-3 lg:gap-6">
          {programmes.map((programme) => (
            <ProgrammeCard key={programme.id} programme={programme} compact />
          ))}
        </Carousel>
      </div>
    </section>
  );
}
