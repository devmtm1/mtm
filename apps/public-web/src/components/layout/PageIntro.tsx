import type { ReactNode } from 'react';

interface PageIntroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}

export function PageIntro({ eyebrow, title, description, children }: PageIntroProps) {
  return (
    <div className="bg-mtm-surface">
      <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6">
        {eyebrow && (
          <span className="text-xs font-bold uppercase tracking-wider text-mtm-primary">
            {eyebrow}
          </span>
        )}
        <h1 className="mt-2 font-display text-3xl font-bold text-mtm-text sm:text-4xl">{title}</h1>
        {description && <p className="mt-4 text-base text-mtm-muted">{description}</p>}
        {children}
      </div>
    </div>
  );
}
