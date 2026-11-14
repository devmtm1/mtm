import { useState, type ReactNode } from 'react';
import { Check, ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { FaqDemarches } from '../demarches/FaqDemarches';
import { ListeCompacte, type ElementService, type Icone } from './ServicesBlocs';

/** Le titre de la page : tous les mots en bleu marine, sauf le dernier en rouge (« Gestion » + « locative »). Un mot seul reste bleu. */
function TitreBicolore({ titre }: { titre: string }) {
  const mots = titre.trim().split(/\s+/);
  if (mots.length < 2) return <>{titre}</>;
  const dernier = mots.pop();
  return (
    <>
      {mots.join(' ')} <span className="text-mtm-accent">{dernier}</span>
    </>
  );
}

/** Les étapes en une rangée : un numéro et un titre, sans phrases. Le détail n'aide pas celui qui veut seulement agir. */
export function EtapesEnLigne({ etapes, titre }: { etapes: ElementService[]; titre: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-mtm-accent">{titre}</p>
      <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(8.25rem,1fr))]">
        {etapes.map((etape, index) => (
          <li key={etape.title} className="flex items-center gap-2.5 rounded-2xl bg-white p-3 shadow-card">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${index === etapes.length - 1 ? 'bg-mtm-accent' : 'bg-mtm-primary-dark'}`}
            >
              {index + 1}
            </span>
            <span className="min-w-0 text-[13px] font-semibold leading-snug text-mtm-text">{etape.title}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

interface ServiceEtDemandeProps {
  /** Petite mention rouge au-dessus du titre (« Nos services · MTM Gestion »). */
  eyebrow: string;
  /** Titre de la page (« Gestion locative ») : c'est le seul h1 de la page sur ordinateur. */
  titrePage: string;
  /** Phrase d'accroche, en rouge sous le titre. */
  accroche: string;
  intro: string;
  /** Les engagements, en rangée sous les cartes (modifiables au back-office). */
  engagements: string[];
  /** Photo de fond, à droite derrière le formulaire. Sans photo (ou trop petite pour couvrir la page) : un fond clair aux couleurs de la marque. */
  image?: string;
  elements: ElementService[];
  icone: (titre: string, index: number) => Icone;
  /** Quand une carte ouvre une demande (page Démarches). */
  action?: { libelle: string; surClic: (titre: string) => void };
  etapes: ElementService[];
  titreEtapes: string;
  /** Le formulaire (ordinateur seulement : sur mobile la demande s'ouvre dans une feuille). */
  formulaire: ReactNode;
  /** Ancre de la demande : les liens y mènent. */
  idFormulaire: string;
  titreFormulaire: string;
  iconeFormulaire: LucideIcon;
  assurance: string;
  /** Sous le formulaire (ex. un lien WhatsApp). */
  pied?: ReactNode;
}

/**
 * Le premier écran d'une page de service (Gestion locative, Construction, Démarches), sur ordinateur : le titre et ce que MTM
 * fait à gauche, en cartes à pictogramme avec les engagements en dessous ; la demande à droite, sur une carte posée sur la photo.
 * Tout se voit sans défiler, et la demande est là quand on a lu. Sur mobile, la page reste ce qu'elle était : bandeau, liste
 * dépliable et demande dans une feuille (le bandeau est rendu par la page).
 */
export function ServiceEtDemande(props: ServiceEtDemandeProps) {
  const mobile = useIsMobile();
  const { elements, icone, action } = props;

  if (mobile) {
    return (
      <section id="prestations" className="scroll-mt-24 bg-mtm-bg py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-mtm-accent">Ce que nous faisons</p>
            <h2 className="mt-2 font-display text-[1.5rem] font-extrabold leading-tight text-mtm-text">{props.accroche}</h2>
            <div className="mt-5">
              <ListeCompacte elements={elements} icone={icone} action={action} colonnes={2} />
            </div>
          </div>
        </div>
      </section>
    );
  }

  const { eyebrow, titrePage, accroche, image, formulaire, idFormulaire, titreFormulaire, iconeFormulaire: IconeFormulaire, assurance, pied } = props;
  /** Une prestation mène à la demande : on y amène le curseur dans le premier champ. */
  const versFormulaire = () => {
    const carte = document.getElementById(idFormulaire);
    carte?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    carte?.querySelector<HTMLElement>('input, select, textarea')?.focus({ preventScroll: true });
  };
  // Ordinateur : une page épurée. À gauche le titre et la liste de ce que fait MTM, à droite la demande ; ni photo de fond, ni
  // cartes, ni engagements ni étapes répétés (le détail reste sur mobile, où la page est une liste dépliable).
  return (
    <section id="prestations" className="bg-white pb-16 lg:pb-20">
      <div className="mx-auto grid max-w-6xl items-start gap-12 px-4 pt-14 sm:px-6 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <p className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.2em] text-mtm-primary-medium">
            <span aria-hidden="true" className="h-[3px] w-12 rounded-full bg-mtm-accent" />
            {eyebrow}
          </p>
          <h1 className="mt-4 font-display text-5xl font-extrabold leading-[1.05] text-mtm-primary-dark xl:text-6xl">
            <TitreBicolore titre={titrePage} />
          </h1>
          <p className="mt-4 max-w-2xl font-display text-2xl font-bold leading-snug text-mtm-primary-dark">{accroche}</p>

          <ul className="mt-8 flex flex-col divide-y divide-mtm-border/70 border-y border-mtm-border/70">
            {elements.map((element) => (
              <li key={element.title}>
                <button
                  type="button"
                  onClick={() => (action ? action.surClic(element.title) : versFormulaire())}
                  aria-label={action ? `${action.libelle} : ${element.title}` : undefined}
                  className="group flex w-full items-center gap-3.5 py-3 text-left"
                >
                  <Check className="h-5 w-5 shrink-0 text-mtm-accent" strokeWidth={3} aria-hidden="true" />
                  <span className="min-w-0 flex-1 font-display text-[17px] font-bold leading-snug text-mtm-text">{element.title}</span>
                  {action && <ChevronRight className="h-5 w-5 shrink-0 text-mtm-primary transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
          {image && <img src={image} alt="" loading="lazy" className="mt-8 h-52 w-full rounded-3xl object-cover shadow-card" />}
        </div>

        <div id={idFormulaire} className="scroll-mt-24 rounded-3xl bg-white p-7 shadow-card-hover ring-1 ring-mtm-border/60 lg:sticky lg:top-24">
          <div className="flex items-center gap-4 border-b border-mtm-border pb-5">
            <IconeFormulaire className="h-12 w-12 shrink-0 text-mtm-accent" strokeWidth={1.5} aria-hidden="true" />
            <div>
              <h2 className="font-display text-2xl font-bold leading-tight text-mtm-text">{titreFormulaire}</h2>
              <p className="mt-0.5 text-[15px] text-mtm-muted">{assurance}</p>
            </div>
          </div>
          <div className="mt-5">{formulaire}</div>
          {pied}
        </div>
      </div>
    </section>
  );
}

/** Les questions fréquentes : les trois premières, puis « Toutes les questions » pour les autres. */
export function FaqCourte({ questions, visibles = 3 }: { questions: ElementService[]; visibles?: number }) {
  const [toutes, setToutes] = useState(false);
  if (questions.length === 0) return null;
  const affichees = toutes ? questions : questions.slice(0, visibles);
  const cachees = questions.length - visibles;

  return (
    <section id="faq" className="scroll-mt-24 bg-white py-8 lg:py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 [&>*]:max-w-3xl">
        <h2 className="font-display text-lg font-bold text-mtm-text">Questions fréquentes</h2>
        <div className="mt-4">
          <FaqDemarches questions={affichees} />
        </div>
        {cachees > 0 && (
          <button
            type="button"
            aria-expanded={toutes}
            onClick={() => setToutes((valeur) => !valeur)}
            className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-mtm-accent hover:underline"
          >
            {toutes ? 'Réduire' : `Toutes les questions (${questions.length})`}
            <ChevronDown className={`h-4 w-4 transition-transform ${toutes ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}
