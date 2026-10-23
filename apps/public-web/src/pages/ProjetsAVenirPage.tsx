import { ShowcaseVitrine } from '../components/showcase/ShowcaseVitrine';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { CtaBand } from '../components/ui/CtaBand';

export function ProjetsAVenirPage() {
  usePageMetadata({
    title: 'Projets à venir',
    description: 'Les prochains projets et programmes immobiliers préparés par MTM Immobilier au Sénégal.',
  });

  return (
    <div>
      <ShowcaseVitrine
        category="projet_a_venir"
        eyebrow="Projets à venir"
        title="Nos prochains projets"
        subtitle="Les programmes que MTM Immobilier prépare pour vous"
        texte="Terrains aménagés, villas et résidences : découvrez en avant-première les projets en préparation et rapprochez-vous de notre équipe pour réserver votre place."
        emptyLabel="Aucun projet à venir publié pour le moment"
        legende="Visuels indicatifs — projets présentés à titre d’exemple"
      />
      <CtaBand />
    </div>
  );
}
