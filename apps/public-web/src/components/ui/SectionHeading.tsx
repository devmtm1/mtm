import type { ReactNode } from 'react';

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  align?: 'left' | 'center';
  /** Utiliser sur un fond sombre (ex. bg-mtm-primary-dark) pour garder un contraste suffisant. */
  inverted?: boolean;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  inverted = false,
}: SectionHeadingProps) {
  const alignment = align === 'center' ? 'text-center items-center mx-auto' : 'text-left items-start';
  const eyebrowColor = inverted ? 'text-white/70' : 'text-mtm-primary';
  const titleColor = inverted ? 'text-white' : 'text-mtm-text';
  const descriptionColor = inverted ? 'text-white/80' : 'text-mtm-muted';

  return (
    <div className={`flex max-w-2xl flex-col gap-2 ${alignment}`}>
      {eyebrow && (
        <span className={`text-xs font-bold uppercase tracking-wider ${eyebrowColor}`}>{eyebrow}</span>
      )}
      <h2 className={`font-display text-2xl font-bold sm:text-3xl ${titleColor}`}>{title}</h2>
      {description && <p className={`text-sm sm:text-base ${descriptionColor}`}>{description}</p>}
    </div>
  );
}
