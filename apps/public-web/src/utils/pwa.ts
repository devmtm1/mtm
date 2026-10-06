/**
 * Installation de l'application (PWA). Le navigateur n'émet `beforeinstallprompt`
 * qu'une fois, souvent avant que React soit monté : on le capte ici, dès le
 * chargement, et les composants s'abonnent à l'état.
 */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.('(display-mode: standalone)').matches === true || nav.standalone === true;
}

/** iPhone / iPad : pas d'invite automatique, l'installation passe par « Partager ». */
export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export type InstallState = 'installed' | 'available' | 'ios' | 'unavailable';

export function getInstallState(): InstallState {
  if (installed || isStandalone()) return 'installed';
  if (deferred) return 'available';
  if (isIos()) return 'ios';
  return 'unavailable';
}

export function subscribeInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === 'accepted') installed = true;
  emit();
  return outcome === 'accepted';
}

/** À appeler une fois au démarrage : écoute l'invite et enregistre le service worker. */
export function initPwa(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    emit();
  });
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    });
  }
}
