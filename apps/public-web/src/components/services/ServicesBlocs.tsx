import type { ComponentType } from 'react';
import { ArrowRight, ChevronDown, MessageCircle } from 'lucide-react';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { buttonClassName } from '../ui/button-styles';
import { ParcoursVerification } from '../demarches/ParcoursVerification';

/**
 * Briques communes des pages de services (Gestion locative, Construction, Démarches administratives) : un même gabarit
 * court. Sur mobile, les listes deviennent des lignes dépliables et les étapes une grille de titres ; sur ordinateur,
 * des cartes compactes et la frise complète.
 */

export interface ElementService {
  title: string;
  description?: string;
}

export type Icone = ComponentType<{ className?: string; strokeWidth?: number; 'aria-hidden'?: boolean | 'true' | 'false' }>;

/** Titre de section des pages de services : mention rouge, titre, texte d'appui. */
export function EnTeteSection({ mention, titre, texte }: { mention: string; titre: string; texte?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-mtm-accent">{mention}</p>
      <h2 className="mt-3 font-display text-[1.65rem] font-extrabold leading-tight text-mtm-text sm:text-3xl">{titre}</h2>
      {texte && <p className="mt-3 text-[15px] leading-relaxed text-mtm-muted sm:text-base">{texte}</p>}
    </div>
  );
}

interface ListeCompacteProps {
  elements: ElementService[];
  /** Pictogramme d'un élément, d'après son titre ou sa position. */
  icone: (titre: string, index: number) => Icone;
  /** Lien d'action sous la description (ex. « Faire une demande » qui ouvre la demande avec ce sujet). */
  action?: { libelle: string; surClic: (titre: string) => void };
  /** Colonnes sur ordinateur. */
  colonnes?: 2 | 3;
}

/**
 * Liste des prestations. Mobile : des lignes (pictogramme, titre, flèche) dont la description se déplie, pour ne pas
 * empiler de grandes cartes. Ordinateur : des cartes courtes sur deux ou trois colonnes.
 */
export function ListeCompacte({ elements, icone, action, colonnes = 3 }: ListeCompacteProps) {
  const mobile = useIsMobile();

  if (mobile) {
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

  return (
    <ul className={`grid gap-4 sm:grid-cols-2 ${colonnes === 3 ? 'lg:grid-cols-3' : ''}`}>
      {elements.map((element, index) => {
        const Icone = icone(element.title, index);
        return (
          <li key={element.title} className="group flex gap-4 rounded-2xl border border-mtm-border/70 bg-white p-4 shadow-card transition-shadow duration-200 hover:shadow-card-hover sm:p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mtm-primary-subtle text-mtm-primary transition-colors group-hover:bg-mtm-primary group-hover:text-white">
              <Icone className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <h3 className="font-display text-[15px] font-bold text-mtm-text">{element.title}</h3>
              {element.description && <p className="mt-1 text-sm leading-relaxed text-mtm-muted">{element.description}</p>}
              {action && (
                <button
                  type="button"
                  onClick={() => action.surClic(element.title)}
                  aria-label={`${action.libelle} : ${element.title}`}
                  className="mt-2 inline-flex items-center gap-1.5 self-start rounded text-sm font-semibold text-mtm-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mtm-accent"
                >
                  {action.libelle}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Les étapes d'un projet. Ordinateur : la frise complète, avec les descriptions. Mobile : une grille de titres
 * numérotés, sans les descriptions, pour tenir sur un écran.
 */
export function EtapesCourtes({ etapes }: { etapes: ElementService[] }) {
  const mobile = useIsMobile();
  if (!mobile) return <ParcoursVerification etapes={etapes} />;

  return (
    <ol className="grid grid-cols-2 gap-3">
      {etapes.map((etape, index) => {
        const derniere = index === etapes.length - 1;
        return (
          <li key={etape.title} className="flex items-center gap-3 rounded-2xl border border-mtm-border/70 bg-white p-3 shadow-card odd:last:col-span-2">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${derniere ? 'bg-mtm-accent' : 'bg-mtm-primary-dark'}`}
            >
              {index + 1}
            </span>
            <span className="min-w-0 text-sm font-semibold leading-snug text-mtm-text">{etape.title}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Rangée de liens d'ancre sous le bandeau : la page paraît structurée, et on saute directement à ce qu'on cherche. */
export function NavigationPage({ liens }: { liens: { libelle: string; href: string }[] }) {
  return (
    <nav aria-label="Dans cette page" className="sticky top-16 z-20 border-b border-mtm-border bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-6xl overflow-x-auto px-4 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
        <ul className="flex gap-1 whitespace-nowrap py-1">
          {liens.map(({ libelle, href }) => (
            <li key={href}>
              <a
                href={href}
                className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-mtm-muted transition-colors hover:bg-mtm-primary-subtle hover:text-mtm-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-mtm-primary"
              >
                {libelle}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

interface AppelFinalProps {
  titre: string;
  texte: string;
  libelleBouton: string;
  surClic: () => void;
  /** Lien WhatsApp déjà prêt (numéro et message). */
  whatsappHref: string;
}

/** Fin de page sur mobile : un court appel à l'action à la place du formulaire complet, qui s'ouvre dans une feuille. */
export function AppelFinal({ titre, texte, libelleBouton, surClic, whatsappHref }: AppelFinalProps) {
  return (
    <section className="bg-mtm-primary px-4 py-10 text-white">
      <div className="mx-auto max-w-md text-center">
        <h2 className="font-display text-2xl font-extrabold leading-tight">{titre}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-white/85">{texte}</p>
        <div className="mt-6 flex flex-col gap-3">
          <button type="button" onClick={surClic} className={buttonClassName('accent', 'px-6 py-3 text-[15px]')}>
            {libelleBouton}
          </button>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/40 px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-white/10"
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            Discuter sur WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
