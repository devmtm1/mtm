import type { CSSProperties } from 'react';

interface EtapeParcours {
  title: string;
  description?: string;
}

/**
 * Le déroulement d'une vérification avant achat, étape par étape : une frise horizontale sur ordinateur,
 * une ligne verticale sur téléphone. La dernière étape (le rapport remis au client) est en rouge : c'est
 * ce que le visiteur obtient à la fin.
 */
export function ParcoursVerification({ etapes }: { etapes: EtapeParcours[] }) {
  return (
    <ol
      // Le nombre d'étapes s'édite au back-office : la frise s'adapte (colonnes et ligne de liaison).
      style={{ '--n': etapes.length } as CSSProperties}
      className="relative grid gap-0 lg:gap-6 lg:[grid-template-columns:repeat(var(--n),minmax(0,1fr))] lg:before:absolute lg:before:left-[calc(50%/var(--n))] lg:before:right-[calc(50%/var(--n))] lg:before:top-[22px] lg:before:h-px lg:before:bg-[#C9D6E4]"
    >
      {etapes.map((etape, index) => {
        const derniere = index === etapes.length - 1;
        return (
          <li
            key={etape.title}
            className={`relative pb-8 pl-16 last:pb-0 lg:pb-0 lg:pl-0 lg:text-center ${
              derniere ? '' : "before:absolute before:left-[21px] before:top-12 before:bottom-0 before:w-px before:bg-[#C9D6E4] lg:before:hidden"
            }`}
          >
            <span
              className={`absolute left-0 top-0 flex h-11 w-11 items-center justify-center rounded-full text-[15px] font-semibold text-white ring-[6px] ring-white lg:static lg:mx-auto ${
                derniere ? 'bg-[#C8102E]' : 'bg-[#12365A]'
              }`}
            >
              {index + 1}
            </span>
            <h3 className="mt-0.5 text-[16px] font-semibold leading-snug text-[#12365A] lg:mt-4">{etape.title}</h3>
            {etape.description && (
              <p className="mt-1.5 text-[14px] leading-relaxed text-[#34465A] lg:mx-auto lg:max-w-[15rem]">{etape.description}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
