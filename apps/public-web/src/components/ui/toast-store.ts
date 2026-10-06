import { createContext, useContext } from 'react';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastApi {
  /** Affiche une confirmation brève, au-dessus de la barre d'onglets. */
  show: (message: string, tone?: ToastTone) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

/**
 * Confirmations visibles d'une action (« Demande envoyée »). Sans fournisseur
 * (tests, composants isolés), l'appel ne fait rien plutôt que de planter.
 */
export function useToast(): ToastApi {
  return useContext(ToastContext) ?? { show: () => undefined };
}
