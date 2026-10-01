import { useEffect, useRef, useState } from 'react';
import { ROUTES } from '../../routes';
import { LinkButton } from '../ui/LinkButton';
import { useContentBlocks } from '../../hooks/useContentBlocks';
import { HeroQuickSearch } from './HeroQuickSearch';

const DEFAULT_TITLE = 'Investissez en toute confiance, où que vous soyez';
const DEFAULT_SUBTITLE =
  "MTM Immobilier accompagne particuliers et membres de la diaspora dans l'achat de terrains et de villas, la vérification foncière, la gestion locative et la construction — avec transparence et suivi à distance.";
const DEFAULT_CTA = 'Voir nos biens';

/**
 * Connexions sur lesquelles 18 Mo ne passeront pas, quoi qu'on fasse.
 *
 * `3g` en est volontairement absent : `effectiveType` est une mesure de
 * latence et de débit, pas le type de radio. Un téléphone en vraie 4G se
 * déclare couramment « 3g » dès que le réseau est un peu chargé — l'y inclure
 * écartait la vidéo chez la plupart des visiteurs, sans que rien ne le dise.
 */
const RESEAUX_LENTS = ['slow-2g', '2g'];

/**
 * La vidéo de fond joue désormais sur mobile aussi : s'en priver donnait un
 * accueil immobile précisément là où la clientèle regarde le site.
 *
 * Elle reste soumise à trois réserves, parce que le fichier pèse ~18 Mo :
 *
 * - « mouvement réduit » : on respecte la préférence système ;
 * - mode économie de données explicitement activé, ou réseau mesuré en 2G :
 *   l'image fixe suffit, 18 Mo de forfait pour un décor serait une facture
 *   imposée au visiteur ;
 * - montage différé : la vidéo n'est ajoutée qu'une fois la page au repos,
 *   pour qu'elle ne dispute pas la bande passante au premier affichage ni au
 *   catalogue.
 *
 * L'image fixe est affichée dans tous les cas, donc personne ne voit un fond
 * vide pendant que la vidéo arrive.
 */
function useShouldPlayBackgroundVideo(): boolean {
  const [shouldPlay, setShouldPlay] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // `connection` n'existe pas partout (Safari notamment) : son absence ne
    // doit pas priver de vidéo, seule une information explicite le fait.
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    if (connection?.saveData) return;
    if (connection?.effectiveType && RESEAUX_LENTS.includes(connection.effectiveType)) return;

    const demarrer = () => setShouldPlay(true);
    const planifier = (
      window as Window & { requestIdleCallback?: (cb: () => void) => number }
    ).requestIdleCallback;
    if (planifier) {
      const id = planifier(demarrer);
      return () => {
        (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id);
      };
    }
    const minuteur = window.setTimeout(demarrer, 1200);
    return () => window.clearTimeout(minuteur);
  }, []);

  return shouldPlay;
}

export function HeroSection() {
  const { data } = useContentBlocks();
  const playVideo = useShouldPlayBackgroundVideo();
  const videoRef = useRef<HTMLVideoElement>(null);

  // `autoPlay` seul ne suffit pas : plusieurs navigateurs mobiles ignorent
  // l'attribut et n'en disent rien. On demande la lecture explicitement, et
  // un refus (mode économie d'énergie sur iOS, par exemple) laisse simplement
  // l'image fixe en place.
  useEffect(() => {
    if (!playVideo) return;
    void videoRef.current?.play().catch(() => undefined);
  }, [playVideo]);

  const findContent = (key: string): string | undefined =>
    data?.find((block) => block.key === key)?.content;

  const title = findContent('home.hero.title') ?? DEFAULT_TITLE;
  const subtitle = findContent('home.hero.subtitle') ?? DEFAULT_SUBTITLE;
  const ctaLabel = findContent('home.cta.title') ?? DEFAULT_CTA;

  return (
    <section className="relative overflow-hidden bg-mtm-primary-dark">
      {/* Image fixe extraite de la vidéo : fond immédiat sur tous les écrans,
          pendant que la vidéo se charge et quand elle est écartée (économie
          de données, réseau lent, mouvement réduit). */}
      <img
        src="/hero-poster.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
        fetchPriority="high"
      />
      {playVideo && (
        <video
          className="absolute inset-0 h-full w-full object-cover motion-safe:animate-fade-in"
          ref={videoRef}
          src="/video.mp4"
          poster="/hero-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        />
      )}
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
