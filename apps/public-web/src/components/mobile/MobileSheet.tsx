import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface MobileSheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** `right` : tiroir du menu ; `bottom` : feuille remontant du bas. */
  from?: 'right' | 'bottom';
}

/**
 * Tiroir ou feuille plein cadre des écrans mobiles. Verrouille le défilement
 * de la page derrière lui, se ferme avec Échap ou un toucher sur le fond, et
 * rend le focus à l'élément qui l'a ouvert.
 */
export function MobileSheet({ title, onClose, children, from = 'bottom' }: MobileSheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  // Rappel gardé en référence : un parent qui passe une fonction neuve à chaque
  // rendu ne doit pas refermer puis rouvrir le verrou de défilement et le focus.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, []);

  const panel =
    from === 'right'
      ? 'absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col rounded-l-3xl motion-safe:animate-sheet-right'
      : 'absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-3xl motion-safe:animate-sheet-in';

  return (
    <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Fermer"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-mtm-primary-dark/55 backdrop-blur-[2px] motion-safe:animate-fade-in"
      />
      <div className={`${panel} overflow-hidden bg-mtm-surface shadow-[0_-8px_32px_rgba(31,41,55,0.25)]`}>
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <h2 className="font-display text-lg font-bold text-mtm-text">{title}</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-mtm-bg text-mtm-text active:scale-90"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}
