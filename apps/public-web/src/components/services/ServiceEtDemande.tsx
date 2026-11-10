import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, Handshake, Lock, ShieldCheck, Timer, type LucideIcon } from 'lucide-react';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { cloudinarySrcSet } from '../../utils/cloudinary';
import { FaqDemarches } from '../demarches/FaqDemarches';
import { ListeCompacte, type ElementService, type Icone } from './ServicesBlocs';

const ICONES_ENGAGEMENTS: LucideIcon[] = [ShieldCheck, Handshake, Timer];

/** Les prestations en cartes à pictogramme rond : un titre, une courte phrase, et une flèche quand la carte ouvre une demande. */
function CartesPrestations({
  elements,
  icone,
  action,
  versFormulaire,
}: {
  elements: ElementService[];
  icone: (titre: string, index: number) => Icone;
  action?: { libelle: string; surClic: (titre: string) => void };
  /** Une carte sans action de sa page amène à la demande : la flèche promet quelque chose. */
  versFormulaire: () => void;
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {elements.map((element, index) => {
        const Icone = icone(element.title, index);
        const contenu = (
          <>
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-mtm-primary-subtle text-mtm-primary shadow-[inset_0_0_0_1px_rgba(26,73,116,0.06)] transition-colors group-hover:bg-mtm-primary group-hover:text-white">
              <Icone className="h-7 w-7" strokeWidth={1.5} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[15px] font-bold leading-snug text-mtm-text">{element.title}</span>
              {element.description && <span className="mt-0.5 line-clamp-3 text-sm leading-snug text-mtm-muted">{element.description}</span>}
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-mtm-primary" aria-hidden="true" />
          </>
        );
        const classes =
          'group flex h-full w-full items-center gap-3.5 rounded-2xl bg-white/90 p-3.5 text-left shadow-card ring-1 ring-white/70 backdrop-blur-md transition-all duration-150';
        return (
          <li key={element.title}>
            <button
              type="button"
              onClick={() => (action ? action.surClic(element.title) : versFormulaire())}
              aria-label={action ? `${action.libelle} : ${element.title}` : undefined}
              className={`${classes} hover:-translate-y-0.5 hover:shadow-card-hover active:scale-[0.98]`}
            >
              {contenu}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

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
  const { elements, icone, action, etapes, titreEtapes } = props;

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
          <EtapesEnLigne etapes={etapes} titre={titreEtapes} />
        </div>
      </section>
    );
  }

  const { eyebrow, titrePage, accroche, intro, engagements, image, formulaire, idFormulaire, titreFormulaire, iconeFormulaire: IconeFormulaire, assurance, pied } = props;
  const srcSet = image ? cloudinarySrcSet(image) : '';
  /** Une carte de prestation mène à la demande : on y amène le curseur dans le premier champ. */
  const versFormulaire = () => {
    const carte = document.getElementById(idFormulaire);
    carte?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    carte?.querySelector<HTMLElement>('input, select, textarea')?.focus({ preventScroll: true });
  };
  return (
    <section id="prestations" className="relative isolate overflow-hidden bg-white pb-16 lg:pb-20">
      {/* La photo couvre toute la section, éclaircie ; un voile blanc, opaque à gauche, la fait se fondre derrière le texte : pas de bord net. */}
      {image ? (
        <>
          <img
            src={image}
            srcSet={srcSet || undefined}
            sizes={srcSet ? '100vw' : undefined}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-80 brightness-110 saturate-75"
          />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.18),rgba(255,255,255,0.88)_30%,rgba(255,255,255,0.84)_66%,rgba(255,255,255,0.3))]" />
        </>
      ) : (
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-br from-white via-mtm-primary-subtle/60 to-mtm-primary-subtle" />
      )}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-gradient-to-t from-white to-transparent" />

      {/* Courbe de la marque, en bas à gauche : bleu marine et liseré rouge. */}
      <svg aria-hidden="true" viewBox="0 0 520 110" preserveAspectRatio="none" className="absolute bottom-0 left-0 -z-10 h-24 w-[34%]">
        <path d="M0 44 C 150 58, 320 88, 520 110 L0 110 Z" className="fill-mtm-primary-dark" />
        <path d="M0 24 C 160 40, 330 74, 520 110 C 330 82, 160 58, 0 36 Z" className="fill-mtm-accent" />
      </svg>

      <div className="mx-auto grid max-w-7xl items-start gap-10 px-8 pt-12 lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:pt-14">
        <div>
          <p className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.2em] text-mtm-primary-medium">
            <span aria-hidden="true" className="h-[3px] w-12 rounded-full bg-mtm-accent" />
            {eyebrow}
          </p>
          <h1 className="mt-4 font-display text-5xl font-extrabold leading-[1.05] text-mtm-primary-dark xl:text-6xl">
            <TitreBicolore titre={titrePage} />
          </h1>
          <p className="mt-4 max-w-2xl font-display text-2xl font-bold leading-snug text-mtm-primary-dark">{accroche}</p>
          <p className="mt-3 max-w-xl text-lg leading-relaxed text-mtm-muted">{intro}</p>

          <div className="mt-7">
            <CartesPrestations elements={elements} icone={icone} action={action} versFormulaire={versFormulaire} />
          </div>

          {engagements.length > 0 && (
            <ul className="mt-8 grid grid-cols-3">
              {engagements.slice(0, 3).map((engagement, index) => {
                const IconeEngagement = ICONES_ENGAGEMENTS[index % ICONES_ENGAGEMENTS.length];
                return (
                  <li key={engagement} className="flex items-center gap-3 border-mtm-accent px-4 text-sm font-semibold leading-snug text-mtm-primary-dark first:pl-0 [&:not(:first-child)]:border-l-2">
                    <IconeEngagement className="h-10 w-10 shrink-0 text-mtm-primary" strokeWidth={1.4} aria-hidden="true" />
                    {engagement}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-8">
            <EtapesEnLigne etapes={etapes} titre={titreEtapes} />
          </div>
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
          <p className="mt-4 flex items-center gap-2 text-xs text-mtm-muted">
            <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Vos données sont sécurisées et confidentielles.
          </p>
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
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
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
