import { PageIntro } from '../components/layout/PageIntro';
import { ShowcaseGrid } from '../components/showcase/ShowcaseGrid';

export function RealisationsPage() {
  return (
    <div>
      <PageIntro
        eyebrow="Portfolio"
        title="Nos réalisations"
        description="Un aperçu des projets menés à bien par MTM Immobilier."
      />
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <ShowcaseGrid category="realisation" emptyLabel="Aucune réalisation publiée pour le moment" />
      </section>
    </div>
  );
}
