import { ROUTES } from '../../routes';
import { LinkButton } from '../ui/LinkButton';
import { useHeroContent } from './hero-content';
import { HeroQuickSearch } from './HeroQuickSearch';
import { HeroBackdrop } from './HeroBackdrop';
import { PromoBanner } from './PromoBanner';
import { useHeroPromotions } from '../../hooks/useHeroPromotions';
import { VAGUES } from '../../utils/vagues';

export function HeroSection() {
  const { title, subtitle, ctaLabel } = useHeroContent();
  const { promotions, loading } = useHeroPromotions();

  // Des publicités ou promotions sont en ligne : elles prennent la place de la
  // vidéo (et du texte du bandeau, qui masquerait les affiches). Le titre reste
  // dans la page pour les lecteurs d'écran et le référencement.
  if (promotions.length > 0) {
    return (
      <section className="relative">
        <h1 className="sr-only">{title}</h1>
        <PromoBanner promotions={promotions} variant="hero" />
      </section>
    );
  }

  return (
    <section className="relative flex min-h-[420px] items-center overflow-hidden bg-mtm-primary-dark sm:min-h-[500px] lg:min-h-[540px]">
      {/* Tant que l'on ignore s'il y a des publicités, la vidéo n'est pas lancée :
          elle ne se lirait que pour être remplacée aussitôt. */}
      <HeroBackdrop lecture={!loading} />
      {/* Même voile que les bandeaux des autres pages : bleu marine fort à gauche, là où se lit le texte, qui s'efface
          vers la droite pour laisser voir l'image. Plus dense sur mobile, où le texte couvre toute la largeur. */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-[#0a2142]/90 via-[#0a2142]/40 to-transparent max-sm:bg-gradient-to-b max-sm:from-[#0a2142]/80 max-sm:via-[#0a2142]/60 max-sm:to-[#0a2142]/70"
        aria-hidden="true"
      />
      {/* Vague en bas : le hero se fond dans la page, sous la recherche rapide qui le chevauche. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 90"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-10 w-full text-mtm-bg sm:h-14 lg:h-16"
        fill="currentColor"
      >
        <path d={VAGUES.discrete} />
      </svg>
      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-start gap-4 px-4 py-10 [text-shadow:0_1px_14px_rgba(10,33,66,0.5)] sm:gap-6 sm:px-6 sm:pb-32 sm:pt-24">
        <span className="hidden rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white sm:inline-block">
          Terrains · Gestion locative · Construction
        </span>
        <h1 className="max-w-2xl whitespace-pre-line font-display text-3xl font-bold text-white sm:text-4xl md:text-5xl">
          {title}
        </h1>
        <p className="max-w-xl text-sm text-white/80 sm:text-lg">{subtitle}</p>

        {/* Mobile : un seul champ « où cherchez-vous ? » dans le hero ; les
            critères détaillés sont dans les filtres du catalogue. Sur grand
            écran, la recherche rapide à 3 champs prend le relais sous le hero. */}
        <div className="w-full lg:hidden">
          <HeroQuickSearch />
        </div>

        {/* Mobile : le champ de recherche et la barre d'action fixe portent
            déjà « voir nos biens » ; seule la vérification reste ici. */}
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <LinkButton to={ROUTES.catalog} variant="accent" className="hidden sm:inline-flex">
            {ctaLabel}
          </LinkButton>
          <LinkButton to={ROUTES.demarches} variant="onDarkOutline" className="w-full sm:w-auto">
            Demander une vérification
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
