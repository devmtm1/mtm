import type { ComponentType } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';

/** Briques communes des pages de services (Gestion locative, Construction, Démarches administratives) sur mobile. */

export interface ElementService {
  title: string;
  description?: string;
}

export type Icone = ComponentType<{ className?: string; strokeWidth?: number; 'aria-hidden'?: boolean | 'true' | 'false' }>;

interface ListeCompacteProps {
  elements: ElementService[];
  /** Pictogramme d'un élément, d'après son titre ou sa position. */
  icone: (titre: string, index: number) => Icone;
  /** Lien d'action sous la description (ex. « Faire une demande » qui ouvre la demande avec ce sujet). */
  action?: { libelle: string; surClic: (titre: string) => void };
}

/**
 * Liste des prestations sur mobile : des lignes (pictogramme, titre, flèche) dont la description se déplie, pour ne pas
 * empiler de grandes cartes. (Sur ordinateur, les pages de services ont leur propre liste, dans ServiceEtDemande.)
 */
export function ListeCompacte({ elements, icone, action }: ListeCompacteProps) {
  return (
    <ul className="divide-y divide-mtm-border overflow-hidden rounded-2xl border border-mtm-border/70 bg-white shadow-card">
      {elements.map((element, index) => {
        const Icone = icone(element.title, index);
        return (
          <li key={element.title}>
            <details className="group">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 text-mtm-text focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mtm-accent [&::-webkit-details-marker]:hidden">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mtm-primary-subtle text-mtm-primary">
                  <Icone className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 font-display text-[15px] font-bold leading-snug">{element.title}</span>
                <ChevronDown className="h-5 w-5 shrink-0 text-mtm-accent transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="pb-4 pl-[4.25rem] pr-4">
                {element.description && <p className="text-sm leading-relaxed text-mtm-muted">{element.description}</p>}
                {action && (
                  <button
                    type="button"
                    onClick={() => action.surClic(element.title)}
                    aria-label={`${action.libelle} : ${element.title}`}
                    className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-mtm-accent"
                  >
                    {action.libelle}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
