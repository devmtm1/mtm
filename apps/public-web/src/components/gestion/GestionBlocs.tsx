import type { ComponentType } from 'react';
import { BellRing, FileSignature, FileText, KeyRound, UserSearch, Wallet } from 'lucide-react';

interface Element {
  title: string;
  description?: string;
}

type Icone = ComponentType<{ className?: string; strokeWidth?: number; 'aria-hidden'?: boolean | 'true' | 'false' }>;

const ICONES_SERVICES: Icone[] = [UserSearch, FileSignature, Wallet, BellRing, KeyRound, FileText];

export type { Icone };

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

/** Ce que MTM prend en charge : une carte par prestation, avec son pictogramme (ceux de la page par défaut). */
export function GrilleServices({ services, icones = ICONES_SERVICES }: { services: Element[]; icones?: Icone[] }) {
  return (
    // Trois colonnes pour 3 ou 6 cartes ; deux pour les autres nombres (4 cartes : 2 × 2, pas une carte seule en bas).
    <ul className={`grid gap-3 sm:grid-cols-2 lg:gap-4 ${services.length % 3 === 0 ? 'lg:grid-cols-3' : ''}`}>
      {services.map((service, index) => {
        const Icone = icones[index % icones.length];
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
