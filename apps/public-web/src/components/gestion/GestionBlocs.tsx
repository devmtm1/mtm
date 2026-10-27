import type { ComponentType } from 'react';
import { BedDouble, BellRing, Building2, FileSignature, FileText, KeyRound, Store, UserSearch, Wallet } from 'lucide-react';

interface Element {
  title: string;
  description?: string;
}

type Icone = ComponentType<{ className?: string; strokeWidth?: number; 'aria-hidden'?: boolean | 'true' | 'false' }>;

const ICONES_SERVICES: Icone[] = [UserSearch, FileSignature, Wallet, BellRing, KeyRound, FileText];
const ICONES_BIENS: Icone[] = [Building2, Building2, BedDouble, Store];

/** Ce que MTM prend en charge : une carte par prestation, avec son pictogramme. */
export function GrilleServices({ services }: { services: Element[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
      {services.map((service, index) => {
        const Icone = ICONES_SERVICES[index % ICONES_SERVICES.length];
        return (
          <li
            key={service.title}
            className="rounded-2xl border border-mtm-border/70 bg-white p-5 shadow-card transition-shadow duration-200 hover:shadow-card-hover sm:p-6"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-mtm-primary-subtle text-mtm-primary">
              <Icone className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-display text-base font-bold text-mtm-text">{service.title}</h3>
            {service.description && <p className="mt-1.5 text-sm leading-relaxed text-mtm-muted">{service.description}</p>}
          </li>
        );
      })}
    </ul>
  );
}

/** Les types de biens que MTM gère : une tuile par famille de biens. */
export function TuilesBiens({ biens }: { biens: Element[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:gap-5">
      {biens.map((bien, index) => {
        const Icone = ICONES_BIENS[index % ICONES_BIENS.length];
        return (
          <li key={bien.title} className="flex gap-4 rounded-2xl border border-mtm-border/70 bg-mtm-bg p-5 sm:p-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-mtm-accent shadow-card">
              <Icone className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-display text-base font-bold text-mtm-text">{bien.title}</h3>
              {bien.description && <p className="mt-1 text-sm leading-relaxed text-mtm-muted">{bien.description}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
