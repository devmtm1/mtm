import type { ReactNode } from 'react';

interface TitreSectionProps {
  id: string;
  /** Icône posée devant le titre, en bleu marine. */
  icone: ReactNode;
  titre: string;
  /** Une phrase qui dit quoi faire ou quoi attendre de la section. */
  sousTitre?: string;
}

/** Le titre de chaque section de la page d'un lotissement : une icône, le titre, puis un court trait rouge carmin (le même que sous les mentions des bandeaux du site). */
export function TitreSection({ id, icone, titre, sousTitre }: TitreSectionProps) {
  return (
    <div>
      <h2 id={id} className="flex items-center gap-2.5 font-display text-2xl font-bold text-mtm-text sm:text-[1.7rem]">
        <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center text-mtm-primary [&>svg]:h-7 [&>svg]:w-7">
          {icone}
        </span>
        {titre}
      </h2>
      <span aria-hidden="true" className="mt-2 block h-1 w-12 rounded-full bg-mtm-accent" />
      {sousTitre && <p className="mt-2.5 text-sm text-mtm-muted sm:text-[15px]">{sousTitre}</p>}
    </div>
  );
}
