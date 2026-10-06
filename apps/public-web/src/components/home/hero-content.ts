import { useContentBlocks } from '../../hooks/useContentBlocks';

export const DEFAULT_HERO_TITLE = 'Investissez en toute confiance, où que vous soyez';
export const DEFAULT_HERO_SUBTITLE =
  "MTM Immobilier accompagne particuliers et membres de la diaspora dans l'achat de terrains et de villas, la vérification foncière, la gestion locative et la construction — avec transparence et suivi à distance.";
export const DEFAULT_HERO_CTA = 'Voir nos biens';

/**
 * Textes du hero, administrables au back-office (blocs de contenu `home.*`).
 * Partagés par l'accueil ordinateur et l'accueil mobile : les deux disent la
 * même chose, la modification d'un texte vaut pour les deux.
 */
export function useHeroContent() {
  const { data } = useContentBlocks();
  const find = (key: string): string | undefined => data?.find((block) => block.key === key)?.content;
  return {
    title: find('home.hero.title') ?? DEFAULT_HERO_TITLE,
    subtitle: find('home.hero.subtitle') ?? DEFAULT_HERO_SUBTITLE,
    ctaLabel: find('home.cta.title') ?? DEFAULT_HERO_CTA,
  };
}
