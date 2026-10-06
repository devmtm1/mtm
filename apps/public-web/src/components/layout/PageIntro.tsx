import type { ReactNode } from 'react';

interface PageIntroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}

/**
 * Introduction d'une page. Sur mobile, un bandeau arrondi aux couleurs de MTM,
 * comme l'en-tête d'un écran d'application ; sur ordinateur, le bloc centré
 * sur fond clair.
 */
export function PageIntro({ eyebrow, title, description, children }: PageIntroProps) {
  return (
    <div className="mx-0 rounded-b-3xl bg-gradient-to-br from-mtm-primary to-mtm-primary-dark text-white shadow-card lg:rounded-none lg:bg-none lg:bg-mtm-surface lg:text-mtm-text lg:shadow-none">
      <div className="mx-auto max-w-4xl px-5 pb-8 pt-6 text-left sm:px-6 lg:py-14 lg:text-center">
        {eyebrow && (
          <span className="text-xs font-bold uppercase tracking-wider text-white/75 lg:text-mtm-primary">
            {eyebrow}
          </span>
        )}
        <h1 className="mt-1.5 font-display text-[1.65rem] font-bold leading-tight sm:text-3xl lg:mt-2 lg:text-4xl">{title}</h1>
        {description && <p className="mt-3 text-[15px] leading-relaxed text-white/85 lg:mt-4 lg:text-base lg:text-mtm-muted">{description}</p>}
        {children}
      </div>
    </div>
  );
}
