import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Carte repliable : le résumé reste toujours visible et se touche pour
 * déplier le détail. Une page qui liste plusieurs dossiers ou missions reste
 * courte, et chaque élément garde l'essentiel sous les yeux.
 */
export function ClientDisclosure({
  summary,
  children,
  defaultOpen = false,
  className = '',
}: {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <article className={`overflow-hidden rounded-2xl border border-mtm-border/70 bg-mtm-surface shadow-card lg:rounded-lg lg:border-mtm-border ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((courant) => !courant)}
        className="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors active:bg-mtm-bg/70 sm:px-5"
      >
        <div className="min-w-0 flex-1">{summary}</div>
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mtm-bg text-mtm-muted">
          <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
          <span className="sr-only">{open ? 'Replier le détail' : 'Voir le détail'}</span>
        </span>
      </button>
      {/* La hauteur s'anime ; `inert` retire du clavier et des lecteurs d'écran ce qui est replié. */}
      <div
        id={panelId}
        inert={!open}
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-mtm-border/70 px-4 pb-4 pt-4 sm:px-5">{children}</div>
        </div>
      </div>
    </article>
  );
}

/** Bouton « Voir les N autres » / « Réduire » sous une liste tronquée. */
export function ShowMoreButton({
  hiddenCount,
  expanded,
  onToggle,
  noun,
}: {
  hiddenCount: number;
  expanded: boolean;
  onToggle: () => void;
  /** Ce que la liste contient, au pluriel (« échéances », « règlements »). */
  noun: string;
}) {
  if (hiddenCount <= 0 && !expanded) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-mtm-border py-2.5 text-[13px] font-semibold text-mtm-primary transition-transform active:scale-[0.98]"
    >
      {expanded ? 'Réduire la liste' : `Voir les ${hiddenCount} autres ${noun}`}
      <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
    </button>
  );
}
