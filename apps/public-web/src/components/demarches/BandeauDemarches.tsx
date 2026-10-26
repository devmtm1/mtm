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
    <header className="relative isolate overflow-hidden bg-white">
      <img
        src={source}
        srcSet={srcSet || undefined}
        sizes={srcSet ? '100vw' : undefined}
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        onError={() => setImageMorte(true)}
        className={`absolute inset-0 -z-20 h-full w-full object-cover object-[78%_center] saturate-[1.08] lg:object-[72%_center] ${fondu}`}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-white/80 lg:bg-transparent lg:bg-gradient-to-r lg:from-white lg:via-white/90 lg:via-[26%] lg:to-transparent lg:to-[50%]"
      />

      <div className={`mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10 ${fondu}`}>
        <div className="max-w-[33rem]">
          <p className="text-sm font-extrabold uppercase tracking-wide text-mtm-primary-dark">
            {eyebrow}
            <span aria-hidden="true" className="mt-1 block h-[3px] w-12 rounded-full bg-mtm-accent" />
          </p>

          <h1 className="mt-3 font-display text-[2.4rem] font-extrabold leading-[1.02] tracking-tight text-mtm-primary-dark sm:text-5xl lg:text-[3.5rem]">
            <span className="block">{premier}</span>
            {suite && (
              <>
                {' '}
                <span className="block text-mtm-accent">{suite}</span>
              </>
            )}
          </h1>

          <p className="mt-4 max-w-[30rem] text-base leading-relaxed text-slate-700">{description}</p>

          {points.length > 0 && (
            <ul className="mt-5 grid gap-3.5 sm:grid-cols-3 sm:gap-5">
              {points.map((point, index) => {
                const Icone = ICONES[index % ICONES.length];
                const { haut, bas, rouge } = decouperEngagement(point);
                return (
                  <li key={point} className="flex items-start gap-2.5">
                    <Icone className="mt-0.5 h-8 w-8 shrink-0 text-mtm-primary-dark" strokeWidth={1.5} aria-hidden="true" />
                    <span className="text-[0.82rem] leading-snug">
                      <span className="block font-bold text-mtm-primary-dark">{haut}</span>
                      {bas && (
                        <span className={`block ${rouge ? 'font-bold text-mtm-accent' : 'text-[0.72rem] font-medium text-slate-600'}`}>{bas}</span>
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
            className="mt-6 inline-flex w-full items-center justify-center gap-4 rounded-xl bg-mtm-accent px-8 py-3.5 text-base font-bold text-white shadow-card-hover transition-colors hover:bg-mtm-accent-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-accent sm:w-auto sm:min-w-[17rem]"
          >
            {bouton}
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
