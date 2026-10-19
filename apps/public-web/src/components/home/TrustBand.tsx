import { Globe2, ShieldCheck, UserCheck } from 'lucide-react';

const ITEMS = [
  { icon: ShieldCheck, title: 'Biens vérifiés', text: 'Contrôlés par nos équipes avant publication.' },
  { icon: Globe2, title: 'Suivi à distance', text: 'Pensé pour la diaspora, où que vous soyez.' },
  { icon: UserCheck, title: 'Un interlocuteur dédié', text: 'Le même conseiller jusqu’à la signature.' },
];

/**
 * Les trois engagements de MTM (sections 6 et 7 du CDC), juste sous le hero :
 * ce qui rassure avant de faire défiler, en un bandeau compact.
 */
export function TrustBand() {
  return (
    <section className="border-b border-mtm-border bg-mtm-surface lg:mt-10 lg:border-0 lg:bg-transparent" aria-label="Nos engagements">
      {/* Ordinateur : trois cartes avec une pastille d'icône, au lieu d'un
          filet discret — c'est ce qui distingue MTM, il doit se voir. */}
      <ul className="mx-auto grid max-w-6xl grid-cols-3 divide-x divide-mtm-border px-2 sm:px-6 lg:gap-6 lg:divide-x-0">
        {ITEMS.map(({ icon: Icon, title, text }) => (
          <li
            key={title}
            className="flex flex-col items-center gap-1 px-2 py-3 text-center sm:flex-row sm:items-center sm:gap-3 sm:py-4 sm:text-left lg:gap-4 lg:rounded-lg lg:border lg:border-mtm-border lg:bg-mtm-surface lg:p-5 lg:shadow-card"
          >
            <span className="flex shrink-0 items-center justify-center lg:h-12 lg:w-12 lg:rounded-full lg:bg-mtm-success/10">
              <Icon className="h-5 w-5 text-mtm-success sm:h-6 sm:w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold leading-tight text-mtm-text sm:text-sm lg:text-base">{title}</p>
              <p className="hidden text-xs text-mtm-muted sm:block lg:mt-0.5 lg:text-sm">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
