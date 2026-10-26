import { useState } from 'react';
import { KeyRound, ShieldCheck, Wallet } from 'lucide-react';
import { cloudinarySrcSet } from '../../utils/cloudinary';

/** Photo du bandeau quand aucune image n'a été choisie dans le back-office. */
export const IMAGE_BANDEAU_LOCATIONS = '/hero-poster.jpg';

const ICONES = [ShieldCheck, Wallet, KeyRound];

interface BandeauLocationsProps {
  eyebrow: string;
  title: string;
  description: string;
  /** Engagements affichés sous le texte (« Biens contrôlés par nos équipes »…). */
  points: string[];
  /** Image de fond : celle du back-office, sinon la photo par défaut. */
  image: string;
  /** Les textes se fondent à l'arrivée du contenu : pas de flash du texte par défaut. */
  chargement?: boolean;
}

/**
 * Bandeau de la page « Locations », dans la lignée de « Nos réalisations » : photo en fond sous un voile bleu marine
 * (le texte blanc se lit sur n'importe quelle image), mention soulignée de rouge, titre, présentation, engagements,
 * et une vague en bas. Le panneau de recherche vient le chevaucher. Tous les textes et la photo se modifient dans
 * Contenus du site.
 */
export function BandeauLocations({ eyebrow, title, description, points, image, chargement = false }: BandeauLocationsProps) {
  const [imageMorte, setImageMorte] = useState(false);
  const source = imageMorte ? IMAGE_BANDEAU_LOCATIONS : image;
  const srcSet = source === IMAGE_BANDEAU_LOCATIONS ? '' : cloudinarySrcSet(source);
  const fondu = `transition-opacity duration-300 ${chargement ? 'opacity-0' : 'opacity-100'}`;

  return (
    <header className="relative isolate overflow-hidden bg-mtm-primary-dark text-white">
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
        className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0a2142]/95 via-[#0a2142]/75 to-[#0a2142]/30 max-lg:to-[#0a2142]/60"
      />
      {/* Vague en bas : le bandeau se fond dans le fond de la page, sous le panneau de recherche qui le chevauche. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 90"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-10 w-full text-mtm-bg sm:h-14 lg:h-16"
        fill="currentColor"
      >
        <path d="M0,46 C180,92 360,88 560,52 C760,16 940,6 1140,38 C1270,58 1360,70 1440,52 L1440,90 L0,90 Z" />
      </svg>

      <div className={`relative mx-auto max-w-6xl px-4 pb-24 pt-9 sm:px-6 sm:pb-28 sm:pt-12 lg:pb-32 lg:pt-14 ${fondu}`}>
        <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/90 sm:text-xs">
          <span aria-hidden="true" className="h-[3px] w-12 rounded-full bg-mtm-accent" />
          {eyebrow}
        </p>
        <h1 className="mt-4 max-w-2xl font-display text-[2rem] font-extrabold leading-[1.1] sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/85 sm:text-base">{description}</p>

        {points.length > 0 && (
          <ul className="mt-6 flex flex-wrap gap-x-7 gap-y-2.5">
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
      </div>
    </header>
  );
}
