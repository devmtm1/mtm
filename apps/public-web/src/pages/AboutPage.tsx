import { useContentBlocks } from '../hooks/useContentBlocks';
import { useTeam } from '../hooks/useTeam';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { AboutHero } from '../components/about/AboutHero';
import {
  AboutContact,
  AboutProcess,
  AboutServices,
  AboutStory,
  AboutValues,
} from '../components/about/AboutSections';
import { TeamSection } from '../components/about/TeamSection';
import { CtaBand } from '../components/ui/CtaBand';

const DEFAULT_TAGLINE = 'Une présence locale, une vision ouverte.';
const DEFAULT_TEXT =
  "MTM Immobilier accompagne particuliers et investisseurs — au Sénégal comme à l'international — dans la commercialisation de terrains et de villas, la gestion locative, la construction et les démarches foncières, avec un haut niveau de transparence et de suivi à distance.";

/**
 * Page de présentation de MTM : l'accroche, qui nous sommes, nos valeurs, nos
 * métiers, notre méthode, l'équipe et les moyens de nous joindre. L'accroche et
 * le texte de présentation sont modifiables depuis le back-office (Contenus du
 * site) ; l'équipe l'est depuis Contenu → Équipe.
 */
export function AboutPage() {
  const { data } = useContentBlocks();
  const { data: team } = useTeam();
  usePageMetadata({
    title: 'À propos',
    description:
      'MTM Immobilier : une agence immobilière au Sénégal fondée sur la transparence, la proximité à distance et l’engagement auprès de la diaspora.',
  });
  const tagline = data?.find((block) => block.key === 'about.title')?.content ?? DEFAULT_TAGLINE;
  const text = data?.find((block) => block.key === 'about.text')?.content ?? DEFAULT_TEXT;

  return (
    <div>
      <AboutHero accroche={tagline} />
      <AboutStory texte={text} />
      <AboutValues />
      <AboutServices />
      <AboutProcess />
      <TeamSection team={team} />
      <AboutContact />
      <CtaBand title="Envie de travailler avec nous ?" />
    </div>
  );
}
