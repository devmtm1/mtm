import { ShowcaseGrid } from '../showcase/ShowcaseGrid';
import { SectionHeading } from '../ui/SectionHeading';
import { LinkButton } from '../ui/LinkButton';
import { ROUTES } from '../../routes';

export function UpcomingProjectsSection() {
  return (
    <section className="bg-mtm-surface py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <SectionHeading eyebrow="À venir" title="Projets à venir" />
          <LinkButton to={ROUTES.projetsAVenir} variant="secondary">
            Voir tous les projets
          </LinkButton>
        </div>
        <div className="mt-8">
          <ShowcaseGrid category="projet_a_venir" emptyLabel="Aucun projet à venir publié pour le moment" limit={3} />
        </div>
      </div>
    </section>
  );
}
