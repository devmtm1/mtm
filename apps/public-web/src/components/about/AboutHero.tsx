import { ArrowRight, FolderOpen, Globe2, Layers, ShieldCheck } from 'lucide-react';
import { ROUTES } from '../../routes';
import { LinkButton } from '../ui/LinkButton';

const FAITS = [
  { icon: Layers, titre: '4 métiers', texte: 'Vente, location, construction, démarches' },
  { icon: ShieldCheck, titre: 'Biens vérifiés', texte: 'Contrôlés avant publication' },
  { icon: FolderOpen, titre: 'Suivi en ligne', texte: 'Dossiers et documents à portée de main' },
  { icon: Globe2, titre: 'Sénégal et diaspora', texte: 'Un service pensé pour la distance' },
];

/**
 * Ouverture de la page À propos : bandeau aux couleurs de MTM avec l'accroche
 * et deux appels à l'action, puis quatre faits qui rassurent, posés à cheval
 * sur le bandeau. Même composition sur téléphone et ordinateur ; seules les
 * proportions changent.
 */
export function AboutHero({ accroche }: { accroche: string }) {
  return (
    <header>
      <div className="relative overflow-hidden rounded-b-3xl bg-gradient-to-br from-mtm-primary via-mtm-primary to-mtm-primary-dark text-white lg:rounded-none">
        {/* Décor : deux cercles discrets, sans effet sur la lecture. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/5 lg:h-96 lg:w-96"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 left-1/4 h-64 w-64 rounded-full bg-mtm-accent/10"
        />
        <div className="relative mx-auto max-w-5xl px-5 pb-16 pt-8 sm:px-6 lg:pb-24 lg:pt-16">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/75">
            <span aria-hidden="true" className="h-0.5 w-6 rounded-full bg-mtm-accent" />À propos
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
            MTM Immobilier
          </h1>
          <p className="mt-4 max-w-2xl whitespace-pre-line font-display text-lg font-semibold leading-snug text-white/95 sm:text-xl lg:text-2xl">
            {accroche}
          </p>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/80 sm:text-base">
            Terrains, villas, location, construction et démarches foncières : une seule agence, un
            seul interlocuteur, du premier contact jusqu’à la remise des clés.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <LinkButton to={ROUTES.catalog} variant="onDark">
              Voir nos biens
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </LinkButton>
            <LinkButton to={ROUTES.contact} variant="onDarkOutline">
              Nous contacter
            </LinkButton>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto -mt-9 max-w-5xl px-4 sm:px-6 lg:-mt-12">
        <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-mtm-border/70 bg-mtm-border shadow-card-hover lg:grid-cols-4 lg:rounded-lg">
          {FAITS.map(({ icon: Icon, titre, texte }) => (
            <li key={titre} className="flex items-start gap-3 bg-mtm-surface p-4 lg:p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mtm-primary-subtle text-mtm-primary lg:rounded-md">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-sm font-bold text-mtm-text">{titre}</span>
                <span className="mt-0.5 block text-xs leading-snug text-mtm-muted">{texte}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
