import { Handshake, House, ShieldCheck, TrendingUp, type LucideIcon } from 'lucide-react';

const ENGAGEMENTS: { icone: LucideIcon; texte: string }[] = [
  { icone: Handshake, texte: 'Une équipe à votre écoute' },
  { icone: ShieldCheck, texte: 'Des conseils personnalisés' },
  { icone: House, texte: 'Un accompagnement sur mesure' },
  { icone: TrendingUp, texte: 'Votre satisfaction, notre priorité' },
];

/** Les quatre engagements de l'équipe, en une ligne sur un fond bleu très clair (Contact, Nos services). */
export function BandeauEngagements({ className = '', elements = ENGAGEMENTS }: { className?: string; elements?: { icone: LucideIcon; texte: string }[] }) {
  return (
    <section aria-label="Nos engagements" className={className}>
      <ul className={`grid grid-cols-2 gap-x-4 gap-y-5 rounded-3xl bg-mtm-primary-subtle px-5 py-5 ${elements.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} lg:px-8 [&>li+li]:lg:border-l [&>li+li]:lg:border-mtm-primary/15 [&>li+li]:lg:pl-6`}>
        {elements.map(({ icone: Icone, texte }) => (
          <li key={texte} className="flex items-center gap-3 text-sm font-semibold leading-snug text-mtm-primary-dark">
            <Icone className="h-7 w-7 shrink-0 text-mtm-primary" strokeWidth={1.6} aria-hidden="true" />
            {texte}
          </li>
        ))}
      </ul>
    </section>
  );
}
