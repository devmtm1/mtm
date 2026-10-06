import type { ReactNode } from 'react';
import { SearchX, type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  /** Icône de l'état : une loupe par défaut, une icône du sujet quand elle parle mieux. */
  icon?: LucideIcon;
  description?: ReactNode;
  /** Action de sortie (ex. réinitialiser les filtres) : un état vide sans issue est une impasse. */
  action?: ReactNode;
}

export function EmptyState({ title, icon: Icon = SearchX, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-mtm-border bg-mtm-surface px-6 py-10 text-center lg:rounded-lg lg:py-14">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-mtm-bg text-mtm-muted">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="text-base font-semibold text-mtm-text">{title}</p>
      {description && <p className="mt-2 max-w-md text-sm text-mtm-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
