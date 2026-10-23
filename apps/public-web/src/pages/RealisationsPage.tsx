import { ShowcaseVitrine } from '../components/showcase/ShowcaseVitrine';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { CtaBand } from '../components/ui/CtaBand';

export function RealisationsPage() {
  usePageMetadata({
    title: 'Nos réalisations',
    description: 'Un aperçu des projets fonciers et immobiliers menés à bien par MTM Immobilier.',
  });

  return (
    <div>
      <ShowcaseVitrine
        category="realisation"
        prefixe="realisations"
        defauts={{
          eyebrow: 'Nos réalisations',
          title: 'Nos projets immobiliers',
          subtitle: 'Des opportunités foncières et résidentielles au Sénégal',
          texte:
            'MTM IMMOBILIER accompagne les particuliers, les familles et les investisseurs dans la recherche et la valorisation d’opportunités immobilières adaptées aux besoins du marché sénégalais.',
        }}
        emptyLabel="Aucune réalisation publiée pour le moment"
      />
      <CtaBand />
    </div>
  );
}
