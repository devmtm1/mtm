import { useState } from 'react';
import { ArrowRight, Clock, FileText, Tag } from 'lucide-react';
import { cloudinarySrcSet } from '../../utils/cloudinary';
import { IMAGE_BANDEAU_DEMARCHES, decouperEngagement } from '../../utils/demarches';

const ICONES = [Clock, FileText, Tag];

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
 * une photo en fond et, par-dessus, des textes réels — mention, titre, présentation, engagements et
 * bouton — tous modifiables dans Contenus du site (la photo aussi). Un fondu blanc à gauche garde le texte
 * lisible quelle que soit la photo choisie.
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
    <header className="relative isolate overflow-hidden bg-white font-['Poppins',ui-sans-serif,system-ui,sans-serif]">
      {/* La photo occupe la droite du bandeau et se fond dans le blanc vers la gauche : le texte reste sur la
          zone claire, et les sujets de la photo (documents, maquette) restent à droite du texte. */}
      <div className="absolute inset-y-0 right-0 -z-20 w-full lg:w-[82%]">
        <img
          src={source}
          srcSet={srcSet || undefined}
          sizes={srcSet ? '(min-width: 1024px) 82vw, 100vw' : undefined}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          onError={() => setImageMorte(true)}
          className={`h-full w-full object-cover object-[72%_center] lg:object-center ${fondu}`}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-white/80 lg:bg-transparent lg:bg-gradient-to-r lg:from-white lg:via-white/70 lg:via-[9%] lg:to-transparent lg:to-[26%]"
        />
      </div>

      <div className={`mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10 ${fondu}`}>
        <div className="max-w-[37rem]">
          <p className="text-[14px] font-bold uppercase tracking-wide text-[#12365A]">
            {eyebrow}
            <span aria-hidden="true" className="mt-1 block h-[3px] w-12 rounded-full bg-[#C8102E]" />
          </p>

          <h1 className="mt-3 text-[34px] font-extrabold leading-[1.08] tracking-tight text-[#12365A] sm:text-[40px] lg:text-[48px]">
            <span className="block">{premier}</span>
            {suite && (
              <>
                {' '}
                <span className="block text-[#C8102E]">{suite}</span>
              </>
            )}
          </h1>

          <p className="mt-4 max-w-[31rem] text-[15px] leading-relaxed text-[#34465A] sm:text-base lg:text-[17px]">{description}</p>

          {points.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-3.5">
              {points.map((point, index) => {
                const Icone = ICONES[index % ICONES.length];
                const { haut, bas, rouge } = decouperEngagement(point);
                return (
                  <li key={point} className="flex max-w-[12.5rem] items-start gap-2.5">
                    <Icone className="mt-0.5 h-8 w-8 shrink-0 text-[#12365A]" strokeWidth={1.5} aria-hidden="true" />
                    <span className="text-[13px] leading-snug">
                      <span className="block whitespace-nowrap font-semibold text-[#12365A]">{haut}</span>
                      {bas && (
                        <span className={`block ${rouge ? 'whitespace-nowrap font-semibold text-[#C8102E]' : 'text-[12px] font-medium text-[#34465A]'}`}>{bas}</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          <button
            type="button"
            onClick={onDemande}
            className="mt-6 inline-flex w-full items-center justify-center gap-4 rounded-xl bg-[#C8102E] px-8 py-3.5 text-[18px] font-semibold text-white shadow-card-hover transition-colors hover:bg-[#A60D26] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] sm:w-auto sm:min-w-[17rem] lg:text-[20px]"
          >
            {bouton}
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
