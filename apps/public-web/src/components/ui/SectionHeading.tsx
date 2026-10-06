import type { ReactNode } from 'react';

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  align?: 'left' | 'center';
  /** Utiliser sur un fond sombre (ex. bg-mtm-primary-dark) pour garder un contraste suffisant. */
  inverted?: boolean;
  /** Mobile : titre seul, plus petit, aligné à gauche ; le style complet revient dès lg. */
  app?: boolean;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  inverted = false,
  app = false,
}: SectionHeadingProps) {
  const centered = 'text-center items-center mx-auto';
  const alignment = align === 'center' ? (app ? 'items-start text-left lg:text-center lg:items-center lg:mx-auto' : centered) : 'text-left items-start';
  const appHide = app ? 'hidden lg:block' : '';
  const eyebrowColor = inverted ? 'text-white/70' : 'text-mtm-primary';
  const titleColor = inverted ? 'text-white' : 'text-mtm-text';
  const descriptionColor = inverted ? 'text-white/80' : 'text-mtm-muted';

  return (
    <div className={`flex max-w-2xl flex-col gap-2 ${alignment}`}>
      {eyebrow && (
        <span className={`text-xs font-bold uppercase tracking-wider ${eyebrowColor} ${appHide}`}>{eyebrow}</span>
      )}
      <h2 className={`font-display font-bold ${app ? 'text-lg lg:text-3xl' : 'text-2xl sm:text-3xl'} ${titleColor}`}>{title}</h2>
      {description && <p className={`text-sm sm:text-base ${descriptionColor} ${appHide}`}>{description}</p>}
    </div>
  );
}
