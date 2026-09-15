import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/** Titre d'écran de l'espace client, avec action facultative à droite. */
export function ClientPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3 sm:mb-6">
      <div className="min-w-0">
        {eyebrow && <p className="text-[11px] font-bold uppercase tracking-wider text-mtm-primary">{eyebrow}</p>}
        <h1 className="font-display text-2xl font-bold text-mtm-text sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-mtm-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Carte blanche standard des écrans : titre facultatif, lien « voir tout » facultatif. */
export function ClientCard({
  title,
  to,
  linkLabel = 'Voir tout',
  children,
  className = '',
}: {
  title?: string;
  to?: string;
  linkLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-mtm-border bg-mtm-surface shadow-card ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-mtm-border px-4 py-3 sm:px-5">
          <h2 className="font-display text-base font-bold text-mtm-text">{title}</h2>
          {to && (
            <Link to={to} className="inline-flex items-center gap-0.5 text-sm font-semibold text-mtm-primary hover:underline">
              {linkLabel}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </header>
      )}
      <div className="px-4 py-3.5 sm:px-5 sm:py-4">{children}</div>
    </section>
  );
}
