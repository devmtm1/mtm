import { useState } from 'react';
import { ArrowRight, BadgeCheck, Clock, FileText } from 'lucide-react';
import { cloudinarySrcSet } from '../../utils/cloudinary';

/** Photo du bandeau quand aucune image n'a été choisie dans le back-office. */
export const IMAGE_BANDEAU_DEMARCHES = '/bandeaux/demarches-fond.jpg';

const ICONES = [Clock, FileText, BadgeCheck];

interface BandeauDemarchesProps {
  eyebrow: string;
  title: string;
  description: string;
  /** Engagements affichés sous le texte (« Réponse sous 24 à 48h »…). */
  points: string[];
  bouton: string;
  /** Image de fond : celle du back-office, sinon la photo par défaut. */
  image: string;
  /** Les textes se fondent à l'arrivée du contenu : pas de flash du texte par défaut. */
  chargement?: boolean;
  onDemande: () => void;
}

/**
 * Grand bandeau de la page « Démarches administratives », pleine largeur comme ceux de « Nos réalisations » :
 * une photo en fond (à droite, fondue dans le blanc à gauche) et, par-dessus, des textes réels — mention,
 * titre, présentation, engagements et bouton — tous modifiables dans Contenus du site.
 */
export function BandeauDemarches({ eyebrow, title, description, points, bouton, image, chargement = false, onDemande }: BandeauDemarchesProps) {
  const [imageMorte, setImageMorte] = useState(false);
  const source = imageMorte ? IMAGE_BANDEAU_DEMARCHES : image;
  const srcSet = source === IMAGE_BANDEAU_DEMARCHES ? '' : cloudinarySrcSet(source);
  const fondu = `transition-opacity duration-300 ${chargement ? 'opacity-0' : 'opacity-100'}`;

  // Le titre se lit en deux temps, comme sur la maquette : le premier mot en bleu, la suite en rouge.
  const [premier, ...reste] = title.split(' ');
  const suite = reste.join(' ');

  return (
    <header className="relative isolate overflow-hidden bg-white">
      {/* La photo occupe la droite du bandeau et se fond dans le blanc vers la gauche : la colonne de texte
          reste sur un fond clair, quelle que soit la photo choisie. */}
      <div className="absolute inset-y-0 right-0 -z-20 w-full lg:w-[58%]">
        <img
          src={source}
          srcSet={srcSet || undefined}
          sizes={srcSet ? '(min-width: 1024px) 58vw, 100vw' : undefined}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          onError={() => setImageMorte(true)}
          className={`h-full w-full object-cover object-center lg:object-left ${fondu}`}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-white/85 lg:bg-transparent lg:bg-gradient-to-r lg:from-white lg:via-white/55 lg:via-[22%] lg:to-transparent lg:to-[62%]"
        />
      </div>

      <div className={`mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-20 ${fondu}`}>
        <div className="max-w-[34rem]">
          <p className="text-sm font-extrabold uppercase tracking-wide text-mtm-primary-dark">
            {eyebrow}
            <span aria-hidden="true" className="mt-1.5 block h-[3px] w-14 rounded-full bg-mtm-accent" />
          </p>

          <h1 className="mt-5 font-display text-[2.4rem] font-extrabold leading-[1.05] text-mtm-primary-dark sm:text-5xl lg:text-6xl">
            <span className="block">{premier}</span>
            {suite && (
              <>
                {' '}
                <span className="block text-mtm-accent">{suite}</span>
              </>
            )}
          </h1>

          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-mtm-text sm:text-base lg:text-lg">{description}</p>

          {points.length > 0 && (
            <ul className="mt-7 flex flex-wrap gap-x-7 gap-y-3.5">
              {points.map((point, index) => {
                const Icone = ICONES[index % ICONES.length];
                return (
                  <li key={point} className="flex max-w-[11.5rem] items-center gap-3 text-sm font-semibold leading-snug text-mtm-primary-dark">
                    <Icone className="h-8 w-8 shrink-0 text-mtm-primary" strokeWidth={1.6} aria-hidden="true" />
                    {point}
                  </li>
                );
              })}
            </ul>
          )}

          <button
            type="button"
            onClick={onDemande}
            className="mt-8 inline-flex items-center justify-center gap-3 rounded-lg bg-mtm-accent px-8 py-3.5 text-base font-bold text-white shadow-card-hover transition-colors hover:bg-mtm-accent-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-accent"
          >
            {bouton}
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
