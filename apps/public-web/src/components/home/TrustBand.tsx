import { Globe2, ShieldCheck, UserCheck } from 'lucide-react';

const ITEMS = [
  { icon: ShieldCheck, title: 'Terrains vérifiés', text: 'Contrôlés par nos équipes avant publication.' },
  { icon: Globe2, title: 'Suivi à distance', text: 'Pensé pour la diaspora, où que vous soyez.' },
  { icon: UserCheck, title: 'Un interlocuteur dédié', text: 'Le même conseiller jusqu’à la signature.' },
];

/**
 * Les trois engagements de MTM (sections 6 et 7 du CDC), juste sous le hero :
 * ce qui rassure avant de faire défiler, en un bandeau compact.
 */
export function TrustBand() {
  return (
    <section className="border-b border-mtm-border bg-mtm-surface lg:mt-8 lg:border-y" aria-label="Nos engagements">
      <ul className="mx-auto grid max-w-6xl grid-cols-3 divide-x divide-mtm-border px-2 sm:px-6">
        {ITEMS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex flex-col items-center gap-1 px-2 py-3 text-center sm:flex-row sm:items-center sm:gap-3 sm:py-4 sm:text-left">
            <Icon className="h-5 w-5 shrink-0 text-mtm-success sm:h-6 sm:w-6" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs font-bold leading-tight text-mtm-text sm:text-sm">{title}</p>
              <p className="hidden text-xs text-mtm-muted sm:block">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
