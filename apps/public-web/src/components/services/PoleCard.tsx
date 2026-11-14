import { ArrowRight, Check, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Pole } from '../../types/poles';
import { FlipCard } from '../ui/FlipCard';
import { iconePole } from './pole-icones';

/** Un lien du site se navigue sans recharger la page ; une adresse https s'ouvre telle quelle. */
function LienPole({ pole }: { pole: Pole }) {
  if (!pole.lienUrl) return null;
  const classes =
    'group/lien inline-flex items-stretch self-start overflow-hidden rounded-full bg-mtm-primary-dark text-[13px] font-bold text-white shadow-card transition-transform active:scale-[0.98]';
  const contenu = (
    <>
      <span className="py-2 pl-5 pr-3 leading-snug">{pole.libelleLien ?? 'En savoir plus'}</span>
      {/* Le segment rouge à pointe inclinée qui ferme le bouton. */}
      <span
        aria-hidden="true"
        className="-ml-1 flex w-10 items-center justify-center bg-mtm-accent transition-colors group-hover/lien:bg-mtm-accent-dark"
        style={{ clipPath: 'polygon(28% 0, 100% 0, 100% 100%, 0 100%)' }}
      >
        <ChevronRight className="ml-1 h-4 w-4" strokeWidth={3} />
      </span>
    </>
  );
  return pole.lienUrl.startsWith('/') ? (
    <Link to={pole.lienUrl} className={classes}>
      {contenu}
    </Link>
  ) : (
    <a href={pole.lienUrl} target="_blank" rel="noopener noreferrer" className={classes}>
      {contenu}
    </a>
  );
}

/** Hauteur d'une carte : la même au recto et au verso, pour que rien ne bouge au retournement. */
const HAUTEUR_CARTE = 'h-[21rem] sm:h-[18.5rem]';

/**
 * L'en-tête et la photo du pôle, comme sur l'affiche : une barre marine portant le numéro (grand rond rouge) et le nom en
 * capitales, une bande rouge pour la mention du pôle, puis la photo.
 */
function EnTete({ pole }: { pole: Pole }) {
  return (
      <div className="shrink-0 bg-mtm-primary-dark">
        <div className="flex items-center gap-3 px-3 pt-2.5">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white bg-mtm-accent font-display text-base font-bold text-white"
          >
            {pole.numero}
          </span>
          <h2 className="font-display text-[15px] font-extrabold uppercase leading-tight tracking-wide text-white">{pole.nom}</h2>
        </div>
        {/* La bande rouge à pointe inclinée sous la barre : elle porte la mention du pôle. */}
        <div
          className="mt-2 flex min-h-6 items-center bg-mtm-accent py-1 pl-4 pr-8"
          style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 0.9rem) 100%, 0 100%)' }}
        >
          {pole.accroche && <p className="text-[11px] font-semibold leading-tight text-white">{pole.accroche}</p>}
        </div>
      </div>
  );
}

function Photo({ pole, large }: { pole: Pole; large: boolean }) {
  return (
      <div className={`relative h-28 shrink-0 overflow-hidden ${large ? 'xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:h-full' : ''}`}>
        {pole.imageUrl ? (
          <img src={pole.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover object-[center_40%] transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none" />
        ) : (
          <div aria-hidden="true" className="h-full w-full bg-gradient-to-br from-mtm-primary-subtle to-mtm-primary-light" />
        )}
      </div>
  );
}

/**
 * Un pôle d'activité, comme sur l'affiche de l'agence : photo coiffée du numéro et de l'onglet marine, vague blanche, puis un
 * rond à pictogramme, les prestations cochées en rouge et le bouton à pointe rouge. Un clic retourne la carte de 180° : le verso
 * détaille le pôle (mention, description, toutes les prestations) et reprend le bouton d'action. Tout le texte et la photo viennent
 * du back-office (Site web → Pôles et services).
 */
export function PoleCard({ pole, retournee, onBasculer, large = false }: { pole: Pole; retournee: boolean; onBasculer: (retournee: boolean) => void; large?: boolean }) {
  const Icone = iconePole(pole.slug);

  // Le recto ne garde que l'essentiel : la photo, le nom, la mention du pôle et l'invitation à retourner la carte. Le détail est au verso.
  const recto = (
    <div className={large ? 'flex min-h-0 flex-1 flex-col xl:grid xl:grid-cols-2 xl:grid-rows-[auto_1fr]' : 'contents'}>
      <EnTete pole={pole} />
      <Photo pole={pole} large={large} />
      <div className="relative flex min-h-0 flex-1 items-center justify-between gap-3 overflow-hidden px-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-mtm-primary-dark text-white shadow-card">
          <Icone className="h-7 w-7 transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-mtm-primary-dark">
          Découvrir les détails
          <ArrowRight className="h-4 w-4 text-mtm-accent transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
        </span>
      </div>
    </div>
  );

  // Le verso tient dans la carte sans défiler : le titre, la mention, puis la liste complète des prestations. La description,
  // qui n'en est que le résumé en une phrase, ne s'affiche que lorsqu'il n'y a aucune prestation à lister.
  const verso = (
    <div className="flex flex-col gap-2">
      <h3 className="font-display text-base font-extrabold leading-tight text-mtm-primary-dark">{pole.nom}</h3>
      {pole.accroche && <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-mtm-accent">{pole.accroche}</p>}
      {pole.points.length > 0 ? (
        <ul className={`mt-1 flex flex-col gap-1.5 text-[13px] text-mtm-text ${large ? 'xl:grid xl:grid-cols-2 xl:gap-x-8' : ''}`}>
          {pole.points.map((point) => (
            <li key={point} className="flex gap-2 leading-snug">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-mtm-accent" strokeWidth={3} aria-hidden="true" />
              {point}
            </li>
          ))}
        </ul>
      ) : (
        pole.description && <p className="text-[13px] leading-relaxed text-mtm-text">{pole.description}</p>
      )}
    </div>
  );

  return (
    <div id={pole.slug} className="scroll-mt-24">
      <FlipCard
        titre={pole.nom}
        retournee={retournee}
        onBasculer={onBasculer}
        recto={recto}
        verso={verso}
        actions={<LienPole pole={pole} />}
        className={HAUTEUR_CARTE}
        large={large}
      />
    </div>
  );
}
