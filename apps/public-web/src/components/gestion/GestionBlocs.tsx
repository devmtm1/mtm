import type { ComponentType } from 'react';
import { BellRing, FileSignature, FileText, KeyRound, UserSearch, Wallet } from 'lucide-react';

interface Element {
  title: string;
  description?: string;
}

type Icone = ComponentType<{ className?: string; strokeWidth?: number; 'aria-hidden'?: boolean | 'true' | 'false' }>;

const ICONES_SERVICES: Icone[] = [UserSearch, FileSignature, Wallet, BellRing, KeyRound, FileText];

/** Ce que MTM prend en charge : une carte par prestation, avec son pictogramme. */
export function GrilleServices({ services }: { services: Element[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
      {services.map((service, index) => {
        const Icone = ICONES_SERVICES[index % ICONES_SERVICES.length];
        return (
          <li
            key={service.title}
            className="flex gap-4 rounded-2xl border border-mtm-border/70 bg-white p-4 shadow-card transition-shadow duration-200 hover:shadow-card-hover sm:p-5"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mtm-primary-subtle text-mtm-primary">
              <Icone className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-display text-[15px] font-bold text-mtm-text">{service.title}</h3>
              {service.description && <p className="mt-1 text-sm leading-relaxed text-mtm-muted">{service.description}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
