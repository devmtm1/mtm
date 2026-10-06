import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { ToastContext, type ToastTone } from './toast-store';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const DUREE_MS = 3600;

const TONES = {
  success: { icon: CheckCircle2, color: 'text-emerald-300' },
  error: { icon: TriangleAlert, color: 'text-red-300' },
  info: { icon: Info, color: 'text-sky-300' },
} as const;

/**
 * Fournit les confirmations à toute l'application. Une seule à la fois : la
 * nouvelle remplace l'ancienne. Annoncée aux lecteurs d'écran (`role="status"`
 * pour un succès, `alert` pour une erreur) sans voler le focus.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const compteur = useRef(0);

  const show = useCallback((message: string, tone: ToastTone = 'success') => {
    compteur.current += 1;
    setToast({ id: compteur.current, message, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), DUREE_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const api = useMemo(() => ({ show }), [show]);
  const { icon: Icon, color } = TONES[toast?.tone ?? 'success'];

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[70] flex justify-center px-4 lg:bottom-6">
        {toast && (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-full bg-mtm-text px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(31,41,55,0.35)] motion-safe:animate-pop-in"
          >
            <Icon className={`h-5 w-5 shrink-0 ${color}`} aria-hidden="true" />
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
