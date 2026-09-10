import type { ReactNode } from 'react';

export function EmptyState({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-mtm-border bg-mtm-surface px-6 py-14 text-center">
      <p className="text-base font-semibold text-mtm-text">{title}</p>
      {description && <p className="mt-2 text-sm text-mtm-muted">{description}</p>}
    </div>
  );
}
