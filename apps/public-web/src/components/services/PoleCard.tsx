import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Pole } from '../../types/poles';
import { iconePole } from './pole-icones';

/** Un lien du site se navigue sans recharger la page ; une adresse https s'ouvre telle quelle. */
function LienPole({ pole }: { pole: Pole }) {
  if (!pole.lienUrl) return null;
  const classes =
    'inline-flex min-h-10 items-center justify-center gap-2 self-center rounded-full bg-mtm-primary-dark px-5 text-[13px] font-semibold text-white shadow-card transition-colors hover:bg-mtm-primary active:scale-[0.98]';
  const contenu = (
    <>
      {pole.libelleLien ?? 'En savoir plus'}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
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

/** La photo du pôle, avec par-dessus l'onglet marine : numéro dans un rond rouge, titre, bord incliné et liseré rouge. */
function PhotoEtOnglet({ pole, className }: { pole: Pole; className: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {pole.imageUrl ? (
        <img src={pole.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div aria-hidden="true" className="h-full w-full bg-gradient-to-br from-mtm-primary-subtle to-mtm-primary-light" />
      )}
      <div className="absolute left-0 top-0 flex max-w-[92%] items-center">
        <div
          className="flex items-center gap-2.5 bg-mtm-primary-dark py-2 pl-2.5 pr-10 shadow-card"
          style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 1.5rem) 100%, 0 100%)' }}
        >
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white bg-mtm-accent font-display text-sm font-bold text-white shadow-card"
          >
            {pole.numero}
          </span>
          <h2 className="font-display text-sm font-bold uppercase leading-tight tracking-wide text-white sm:text-base">{pole.nom}</h2>
        </div>
        {/* Liseré rouge, parallèle au bord incliné de l'onglet. */}
        <span aria-hidden="true" className="-ml-7 h-[3.25rem] w-1.5 -skew-x-[24deg] bg-mtm-accent" />
      </div>
    </div>
  );
}

/**
 * Un pôle d'activité : sa photo coiffée d'un onglet marine (numéro et titre), puis ses prestations cochées en rouge à côté
 * d'un rond bleu à pictogramme, et son bouton. Tout le texte et la photo viennent du back-office (Site web → Pôles et services).
 * `large` : carte pleine largeur, photo à gauche et texte à droite (le dernier pôle quand il reste seul sur sa rangée).
 */
/** Prestations montrées d'emblée sur mobile : au-delà, un bouton les déplie (l'ordinateur les montre toutes). */
const PRESTATIONS_VISIBLES_MOBILE = 3;

export function PoleCard({ pole, large = false }: { pole: Pole; large?: boolean }) {
  const Icone = iconePole(pole.slug);
  const [toutes, setToutes] = useState(false);
  const cachees = pole.points.length - PRESTATIONS_VISIBLES_MOBILE;
  const corps = (
    <div className="flex flex-1 flex-col gap-3 p-4 sm:p-4">
      {pole.accroche && <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-mtm-accent">{pole.accroche}</p>}
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-mtm-primary-dark text-white">
          <Icone className="h-6 w-6" aria-hidden="true" />
        </span>
        {pole.points.length > 0 && (
          <ul className="flex flex-col gap-1 border-l border-mtm-border pl-3 text-[13px] text-mtm-text">
            {pole.points.map((point, index) => (
              <li key={point} className={`gap-2 font-medium leading-snug ${index >= PRESTATIONS_VISIBLES_MOBILE && !toutes ? 'hidden lg:flex' : 'flex'}`}>
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mtm-accent" strokeWidth={3} aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        )}
      </div>
      {cachees > 0 && (
        <button
          type="button"
          aria-expanded={toutes}
          onClick={() => setToutes((valeur) => !valeur)}
          className="-mt-1 self-start text-sm font-semibold text-mtm-accent hover:underline lg:hidden"
        >
          {toutes ? 'Réduire' : `Voir les ${cachees} autre${cachees > 1 ? 's' : ''}`}
        </button>
      )}
      <div className="mt-auto flex flex-col">
        <LienPole pole={pole} />
      </div>
    </div>
  );

  if (large) {
    return (
      <article id={pole.slug} className="scroll-mt-24 overflow-hidden rounded-3xl bg-mtm-surface shadow-card-hover ring-1 ring-mtm-border/60 lg:grid lg:grid-cols-2">
        <PhotoEtOnglet pole={pole} className="aspect-[16/9] lg:aspect-auto lg:min-h-[200px]" />
        {corps}
      </article>
    );
  }
  return (
    <article id={pole.slug} className="flex scroll-mt-24 flex-col overflow-hidden rounded-3xl bg-mtm-surface shadow-card-hover ring-1 ring-mtm-border/60">
      <PhotoEtOnglet pole={pole} className="aspect-[16/9]" />
      {corps}
    </article>
  );
}
