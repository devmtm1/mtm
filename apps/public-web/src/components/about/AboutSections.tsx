import { Link } from 'react-router-dom';
import { ArrowRight, Handshake, HeartHandshake, ShieldCheck, type LucideIcon } from 'lucide-react';
import { ROUTES } from '../../routes';
import { LinkButton } from '../ui/LinkButton';
import { Reveal } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';

const VALEURS: { icon: LucideIcon; titre: string; texte: string }[] = [
  {
    icon: ShieldCheck,
    titre: 'Transparence',
    texte: 'Chaque bien est vérifié avant commercialisation ; les documents sont accessibles à nos clients.',
  },
  {
    icon: HeartHandshake,
    titre: 'Proximité, même à distance',
    texte: 'Un interlocuteur dédié et un suivi régulier, pensés pour la diaspora.',
  },
  {
    icon: Handshake,
    titre: 'Engagement',
    texte: 'De l’acquisition à la construction, nous vous accompagnons à chaque étape.',
  },
];

/** Les quatre métiers en une rangée de liens : un point d'entrée vers chaque page sans une section entière. */
const METIERS = [
  { titre: 'Vente de terrains et villas', to: ROUTES.catalog },
  { titre: 'Gestion locative', to: ROUTES.gestionLocative },
  { titre: 'Construction', to: ROUTES.construction },
  { titre: 'Démarches administratives', to: ROUTES.demarches },
];

/**
 * Qui nous sommes : le texte de présentation (modifiable au back-office), les
 * trois valeurs qui guident MTM et un accès direct à chaque métier. Un seul
 * bloc plutôt que trois, pour que la page ne s'allonge pas inutilement.
 */
export function AboutStory({ texte }: { texte: string }) {
  const paragraphes = texte
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section aria-labelledby="qui-sommes-nous" className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:py-20">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <Reveal>
          <span className="text-xs font-bold uppercase tracking-wider text-mtm-primary">Qui sommes-nous</span>
          <h2 id="qui-sommes-nous" className="mt-2 font-display text-2xl font-bold text-mtm-text sm:text-3xl">
            Une agence qui vous accompagne de bout en bout
          </h2>
          <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-mtm-muted sm:text-base">
            {paragraphes.map((paragraphe, index) => (
              <p key={index}>{paragraphe}</p>
            ))}
          </div>
          <ul className="mt-6 flex flex-wrap gap-2" aria-label="Nos métiers">
            {METIERS.map(({ titre, to }) => (
              <li key={titre}>
                <Link
                  to={to}
                  className="inline-flex items-center gap-1 rounded-full border border-mtm-border bg-mtm-surface px-3.5 py-2 text-xs font-semibold text-mtm-primary transition-colors active:scale-95 hover:border-mtm-primary-light hover:bg-mtm-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-primary sm:text-sm"
                >
                  {titre}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={100}>
          <div className="rounded-2xl border border-mtm-border/70 border-t-4 border-t-mtm-primary bg-mtm-surface p-6 shadow-card lg:rounded-lg lg:p-7">
            <h3 className="font-display text-base font-bold text-mtm-text">Nos valeurs</h3>
            <ul className="mt-5 space-y-5">
              {VALEURS.map(({ icon: Icon, titre, texte }) => (
                <li key={titre} className="flex items-start gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mtm-primary-subtle text-mtm-primary lg:rounded-md">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-[15px] font-bold text-mtm-text">{titre}</span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-mtm-muted">{texte}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const ETAPES = [
  { titre: 'Nous vous écoutons', texte: 'Votre projet, votre budget, vos délais : nous cernons vos besoins avant de proposer quoi que ce soit.' },
  { titre: 'Nous sélectionnons et vérifions', texte: 'Nous ne vous présentons que des biens contrôlés : situation juridique, documents, environnement.' },
  { titre: 'Nous vous accompagnons', texte: 'Visites, démarches administratives, négociation et signature : un interlocuteur dédié à chaque étape.' },
  { titre: 'Nous restons à vos côtés', texte: 'Votre espace client garde vos dossiers et documents à jour, bien après la remise des clés.' },
];

export function AboutProcess() {
  return (
    <section aria-labelledby="notre-methode" className="border-y border-mtm-border/70 bg-mtm-surface">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:py-20">
        <SectionHeading eyebrow="Notre méthode" title="Comment nous travaillons" align="center" />
        <h2 id="notre-methode" className="sr-only">
          Notre méthode
        </h2>
        <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {ETAPES.map(({ titre, texte }, index) => (
            <li key={titre} className="relative flex gap-4 lg:block">
              {/* Trait vertical reliant les étapes sur téléphone. */}
              {index < ETAPES.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-[-2rem] left-5 top-12 w-px bg-mtm-primary-light sm:hidden"
                />
              )}
              <Reveal delay={index * 80} className="flex gap-4 lg:block">
                <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mtm-primary font-display text-base font-bold text-white ring-4 ring-mtm-surface">
                  {index + 1}
                </span>
                <span className="block lg:mt-4">
                  <span className="block font-display text-base font-bold text-mtm-text">{titre}</span>
                  <span className="mt-1.5 block text-sm leading-relaxed text-mtm-muted">{texte}</span>
                </span>
              </Reveal>
            </li>
          ))}
        </ol>
        <div className="mt-10 text-center">
          <LinkButton to={ROUTES.clientLogin} variant="secondary">
            Accéder à mon espace client
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
