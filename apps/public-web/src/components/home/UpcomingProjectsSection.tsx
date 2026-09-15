import { ShowcaseGrid } from '../showcase/ShowcaseGrid';
import { SectionHeading } from '../ui/SectionHeading';
import { LinkButton } from '../ui/LinkButton';
import { ROUTES } from '../../routes';

export function UpcomingProjectsSection() {
  return (
    <section className="bg-mtm-surface py-10 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <SectionHeading eyebrow="À venir" title="Projets à venir" />
          <LinkButton to={ROUTES.projetsAVenir} variant="secondary" className="shrink-0 px-3 sm:px-5">
            Voir tout
          </LinkButton>
        </div>
        <div className="mt-5 sm:mt-8">
          <ShowcaseGrid category="projet_a_venir" emptyLabel="Aucun projet à venir publié pour le moment" limit={3} mobileCarousel />
        </div>
      </div>
    </section>
  );
}
