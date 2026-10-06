import { ROUTES } from '../../routes';
import { LinkButton } from '../ui/LinkButton';
import { useHeroContent } from './hero-content';
import { HeroQuickSearch } from './HeroQuickSearch';
import { HeroBackdrop } from './HeroBackdrop';

export function HeroSection() {
  const { title, subtitle, ctaLabel } = useHeroContent();
  return (
    <section className="relative overflow-hidden bg-mtm-primary-dark">
      <HeroBackdrop />
      {/* Voile sombre neutre : il garantit le contraste du texte blanc sans
          teinter l'image. Une couche de marque très légère par-dessus
          conserve l'identité MTM — un aplat rouge opaque, lui, délavait
          complètement le visuel. Plus dense sur mobile où le texte couvre
          toute la largeur. */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/60 to-black/70 sm:bg-gradient-to-r sm:from-black/80 sm:via-black/55 sm:to-black/25"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-mtm-primary-dark/20 mix-blend-multiply" aria-hidden="true" />
      <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-10 sm:gap-6 sm:px-6 sm:py-28">
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
