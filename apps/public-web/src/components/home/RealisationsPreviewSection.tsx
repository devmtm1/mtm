import { ShowcaseGrid } from '../showcase/ShowcaseGrid';
import { SectionHeading } from '../ui/SectionHeading';
import { SeeAllLink } from '../ui/SeeAllLink';
import { ROUTES } from '../../routes';

export function RealisationsPreviewSection() {
  return (
    <section className="py-6 lg:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <SectionHeading app eyebrow="Nos réussites" title="Nos réalisations" />
          <SeeAllLink to={ROUTES.realisations} />
        </div>
        <div className="mt-3 lg:mt-8">
          <ShowcaseGrid category="realisation" emptyLabel="Aucune réalisation publiée pour le moment" limit={3} mobileCarousel />
        </div>
      </div>
    </section>
  );
}
