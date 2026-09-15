import { ShowcaseGrid } from '../showcase/ShowcaseGrid';
import { SectionHeading } from '../ui/SectionHeading';
import { LinkButton } from '../ui/LinkButton';
import { ROUTES } from '../../routes';

export function RealisationsPreviewSection() {
  return (
    <section className="py-10 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <SectionHeading eyebrow="Nos réussites" title="Nos réalisations" />
          <LinkButton to={ROUTES.realisations} variant="secondary" className="shrink-0 px-3 sm:px-5">
            Voir tout
          </LinkButton>
        </div>
        <div className="mt-5 sm:mt-8">
          <ShowcaseGrid category="realisation" emptyLabel="Aucune réalisation publiée pour le moment" limit={3} mobileCarousel />
        </div>
      </div>
    </section>
  );
}
