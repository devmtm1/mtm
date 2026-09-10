import { ShowcaseGrid } from '../showcase/ShowcaseGrid';
import { SectionHeading } from '../ui/SectionHeading';
import { LinkButton } from '../ui/LinkButton';
import { ROUTES } from '../../routes';

export function RealisationsPreviewSection() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <SectionHeading eyebrow="Nos réussites" title="Nos réalisations" />
          <LinkButton to={ROUTES.realisations} variant="secondary">
            Voir toutes les réalisations
          </LinkButton>
        </div>
        <div className="mt-8">
          <ShowcaseGrid category="realisation" emptyLabel="Aucune réalisation publiée pour le moment" limit={3} />
        </div>
      </div>
    </section>
  );
}
