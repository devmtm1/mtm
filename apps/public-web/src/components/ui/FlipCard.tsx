import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, RotateCw } from 'lucide-react';

interface FlipCardProps {
  /** Nom de la carte, pour les lecteurs d'écran (« Recherche de locataires »). */
  titre: string;
  /** Carte retournée ? L'état vit chez le parent : il peut n'en laisser qu'une ouverte à la fois. */
  retournee: boolean;
  onBasculer: (retournee: boolean) => void;
  /** Contenu du recto. La face se retourne au clic ; un bouton discret en haut à droite fait de même au clavier. */
  recto: ReactNode;
  /** Contenu du verso : texte seulement, il défile si besoin. Les boutons d'action vont dans `actions`. */
  verso: ReactNode;
  /** Boutons d'action du verso (« Confier mon bien »…), en pied de carte. */
  actions?: ReactNode;
  libelleRetour?: string;
  /** Hauteur de la carte : fixe, pour que rien ne saute pendant l'animation. */
  className?: string;
  /** Carte pleine largeur : sur grand écran, elle se retourne autour de son axe horizontal, plus adapté à une face large. */
  large?: boolean;
}

/**
 * Une carte à deux faces qui se retourne de 180° sur son axe vertical. Le recto présente, le verso détaille, sans quitter la
 * page. Accessibilité : le recto est un bouton (`aria-expanded`), la face cachée est retirée du clavier et des lecteurs d'écran
 * (`inert`), le focus suit le retournement, Échap ramène au recto. Avec « mouvement réduit », les faces se fondent au lieu de tourner.
 */
export function FlipCard({ titre, retournee, onBasculer, recto, verso, actions, libelleRetour = 'Retour', className = 'h-[22rem] lg:h-[24rem]', large = false }: FlipCardProps) {
  const idVerso = useId();
  const boutonRecto = useRef<HTMLButtonElement>(null);
  const boutonRetour = useRef<HTMLButtonElement>(null);
  const precedente = useRef(retournee);
  // « repos » tant que la carte n'a jamais tourné : aucune animation, ni focus déplacé, au premier affichage.
  const [dejaTournee, setDejaTournee] = useState(false);

  // Le focus accompagne la carte quand ELLE CHANGE de face : sur « Retour » une fois retournée, sur le recto quand on revient.
  // On compare à la valeur précédente (et non à un « premier rendu »), pour qu'un double montage de développement ne déclenche rien.
  useEffect(() => {
    if (precedente.current === retournee) return;
    precedente.current = retournee;
    setDejaTournee(true);
    (retournee ? boutonRetour : boutonRecto).current?.focus({ preventScroll: true });
  }, [retournee]);

  return (
    <div data-large={large ? '' : undefined} className={`group flip-scene transition-transform duration-300 ease-out motion-reduce:transition-none lg:hover:-translate-y-1 ${className}`}>
      <div className="flip-inner" data-flipped={retournee} data-etat={retournee ? 'verso' : dejaTournee ? 'recto' : 'repos'}>
        <div
          className="flip-face flip-face--front"
          inert={retournee}
          aria-hidden={retournee}
        >
          {/* Tout le recto se retourne au clic (sauf ses propres liens et boutons) ; le bouton rond, lui, sert au clavier et aux lecteurs d'écran. */}
          <div
            onClick={(event) => {
              if (!(event.target as HTMLElement).closest('a, button')) onBasculer(true);
            }}
            className="relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-[22px] bg-mtm-surface text-left shadow-card-hover ring-1 ring-mtm-border/60 transition-shadow duration-300 group-hover:shadow-[0_24px_48px_-20px_rgba(10,33,66,0.4)]"
          >
            {recto}
            <button
              ref={boutonRecto}
              type="button"
              onClick={() => onBasculer(true)}
              aria-expanded={retournee}
              aria-controls={idVerso}
              aria-label={`${titre} : voir les détails`}
              className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-mtm-primary-dark shadow-card ring-1 ring-mtm-border/60 transition-transform duration-300 hover:rotate-180 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-accent motion-reduce:transition-none motion-reduce:hover:rotate-0"
            >
              <RotateCw className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          id={idVerso}
          role="region"
          aria-label={`Détails : ${titre}`}
          inert={!retournee}
          aria-hidden={!retournee}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onBasculer(false);
          }}
          className="flip-face flip-face--back flex flex-col overflow-hidden rounded-[22px] bg-mtm-surface text-mtm-text shadow-card-hover ring-1 ring-mtm-border/60"
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2 pt-5">{verso}</div>
          {/* Pied du verso : le bouton d'action, et « Retour » à côté, sur une seule ligne. */}
          <div className="flex items-center gap-2 border-t border-mtm-border px-4 py-3">
            {actions}
            <button
              ref={boutonRetour}
              type="button"
              onClick={() => onBasculer(false)}
              className="ml-auto inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-mtm-primary transition-colors hover:bg-mtm-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-accent"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {libelleRetour}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
