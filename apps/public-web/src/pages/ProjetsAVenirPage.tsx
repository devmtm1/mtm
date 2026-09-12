import { PageIntro } from '../components/layout/PageIntro';
import { ShowcaseGrid } from '../components/showcase/ShowcaseGrid';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { CtaBand } from '../components/ui/CtaBand';

export function ProjetsAVenirPage() {
  usePageMetadata({
    title: 'Projets à venir',
    description: 'Les prochains projets et programmes immobiliers préparés par MTM Immobilier au Sénégal.',
  });

  return (
    <div>
      <PageIntro
        eyebrow="À venir"
        title="Projets à venir"
        description="Découvrez les prochains projets et programmes préparés par MTM Immobilier."
      />
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <ShowcaseGrid category="projet_a_venir" emptyLabel="Aucun projet à venir publié pour le moment" />
      </section>
      <CtaBand />
    </div>
  );
}
