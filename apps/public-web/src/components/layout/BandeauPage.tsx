import { useState, type ReactNode } from 'react';
import { KeyRound, ShieldCheck, Wallet } from 'lucide-react';
import { cloudinarySrcSet } from '../../utils/cloudinary';
import { VAGUES, type FormeVague } from '../../utils/vagues';

/** Photo du bandeau quand aucune image n'a été choisie dans le back-office. */
export const IMAGE_BANDEAU_PAGE = '/hero-poster.jpg';

const ICONES = [ShieldCheck, Wallet, KeyRound];

interface BandeauPageProps {
  eyebrow: string;
  title: string;
  description: string;
  /** Engagements affichés sous le texte (« Biens contrôlés par nos équipes »…). */
  points?: string[];
  /** Image de fond : celle du back-office, sinon la photo par défaut. */
  image: string;
  /** Les textes se fondent à l'arrivée du contenu : pas de flash du texte par défaut. */
  chargement?: boolean;
  /**
   * Un panneau (recherche, faits) vient chevaucher le bas du bandeau : on réserve alors la place. Sans lui,
   * le bandeau se referme plus court sur sa vague.
   */
  chevauche?: boolean;
  /** Forme de la vague du bas : « ample » (présentation), « douce » (services, par défaut) ou « discrete » (recherche). */
  vague?: FormeVague;
  /** Boutons d'action sous les engagements (ex. « Confier mon bien »). */
  actions?: ReactNode;
}

/**
 * Bandeau d'en-tête des pages du site (Locations, Nos biens, Construction, Contact…) : photo en fond sous un voile bleu marine
 * (le texte blanc se lit sur n'importe quelle image), mention soulignée de rouge, titre, présentation, engagements,
 * et une vague en bas. Un panneau (recherche, faits clés) peut le chevaucher. Tous les textes et la photo se modifient dans
 * Contenus du site.
 */
export function BandeauPage({ eyebrow, title, description, points = [], image, chargement = false, chevauche = true, vague = 'douce', actions }: BandeauPageProps) {
  const [imageMorte, setImageMorte] = useState(false);
  const source = imageMorte ? IMAGE_BANDEAU_PAGE : image;
  const srcSet = source === IMAGE_BANDEAU_PAGE ? '' : cloudinarySrcSet(source);
  const fondu = `transition-opacity duration-300 ${chargement ? 'opacity-0' : 'opacity-100'}`;

  return (
    <header className="relative isolate flex min-h-[340px] items-center overflow-hidden bg-mtm-primary-dark text-white sm:min-h-[400px] lg:min-h-[460px]">
      <img
        src={source}
        srcSet={srcSet || undefined}
        sizes={srcSet ? '100vw' : undefined}
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        onError={() => setImageMorte(true)}
        className={`absolute inset-0 -z-20 h-full w-full object-cover object-[70%_center] ${fondu}`}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0a2142]/90 via-[#0a2142]/40 to-transparent max-lg:via-[#0a2142]/70 max-lg:to-[#0a2142]/50"
      />
      {/* Vague en bas : le bandeau se fond dans le fond de la page, sous le panneau de recherche qui le chevauche. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 90"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-10 w-full text-mtm-bg sm:h-14 lg:h-16"
        fill="currentColor"
      >
        <path d={VAGUES[vague]} />
      </svg>

      <div className={`relative mx-auto w-full max-w-6xl px-4 [text-shadow:0_1px_14px_rgba(10,33,66,0.5)] pt-9 sm:px-6 sm:pt-12 lg:pt-14 ${
          chevauche ? 'pb-24 sm:pb-28 lg:pb-32' : 'pb-16 sm:pb-20 lg:pb-24'
        } ${fondu}`}>
        <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/90 sm:text-xs">
          <span aria-hidden="true" className="h-[3px] w-12 rounded-full bg-mtm-accent" />
          {eyebrow}
        </p>
        <h1 className="mt-4 max-w-2xl font-display text-[2rem] font-extrabold leading-[1.1] sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-xl whitespace-pre-line text-[15px] leading-relaxed text-white/85 sm:text-base">{description}</p>

        {points.length > 0 && (
          <ul className="mt-6 flex max-w-2xl flex-wrap gap-x-7 gap-y-2.5">
            {points.map((point, index) => {
              const Icone = ICONES[index % ICONES.length];
              return (
                <li key={point} className="inline-flex items-center gap-2 text-sm font-medium text-white/90">
                  <Icone className="h-[18px] w-[18px] shrink-0 text-white/75" strokeWidth={1.7} aria-hidden="true" />
                  {point}
                </li>
              );
            })}
          </ul>
        )}

        {actions && <div className="mt-7 flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </header>
  );
}
