import { ShowcaseGrid } from '../showcase/ShowcaseGrid';
import { SectionHeading } from '../ui/SectionHeading';
import { SeeAllLink } from '../ui/SeeAllLink';
import { ROUTES } from '../../routes';

export function UpcomingProjectsSection() {
  return (
    <section className="py-6 lg:bg-mtm-surface lg:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <SectionHeading app eyebrow="À venir" title="Projets à venir" />
          <SeeAllLink to={ROUTES.projetsAVenir} />
        </div>
        <div className="mt-3 lg:mt-8">
          <ShowcaseGrid category="projet_a_venir" emptyLabel="Aucun projet à venir publié pour le moment" limit={3} mobileCarousel />
        </div>
      </div>
    </section>
  );
}
