import type { CSSProperties } from 'react';

interface EtapeParcours {
  title: string;
  description?: string;
}

/**
 * Le déroulement d'un projet, étape par étape : une frise horizontale sur ordinateur, une ligne verticale sur
 * téléphone. La dernière étape (ce que le client obtient à la fin) est en rouge. Partagée par les pages Démarches,
 * Gestion locative et Construction.
 */
export function ParcoursVerification({ etapes }: { etapes: EtapeParcours[] }) {
  return (
    <ol
      // Le nombre d'étapes s'édite au back-office : la frise s'adapte (colonnes et ligne de liaison).
      style={{ '--n': etapes.length } as CSSProperties}
      className="relative grid gap-0 lg:gap-6 lg:[grid-template-columns:repeat(var(--n),minmax(0,1fr))] lg:before:absolute lg:before:left-[calc(50%/var(--n))] lg:before:right-[calc(50%/var(--n))] lg:before:top-[22px] lg:before:h-px lg:before:bg-mtm-border"
    >
      {etapes.map((etape, index) => {
        const derniere = index === etapes.length - 1;
        return (
          <li
            key={etape.title}
            className={`relative pb-8 pl-16 last:pb-0 lg:pb-0 lg:pl-0 lg:text-center ${
              derniere ? '' : 'before:absolute before:left-[21px] before:top-12 before:bottom-0 before:w-px before:bg-mtm-border lg:before:hidden'
            }`}
          >
            <span
              className={`absolute left-0 top-0 flex h-11 w-11 items-center justify-center rounded-full text-[15px] font-semibold text-white ring-[6px] ring-mtm-bg lg:static lg:mx-auto ${
                derniere ? 'bg-mtm-accent' : 'bg-mtm-primary-dark'
              }`}
            >
              {index + 1}
            </span>
            <h3 className="mt-0.5 font-display text-base font-bold leading-snug text-mtm-text lg:mt-4">{etape.title}</h3>
            {etape.description && (
              <p className="mt-1.5 text-sm leading-relaxed text-mtm-muted lg:mx-auto lg:max-w-[15rem]">{etape.description}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
