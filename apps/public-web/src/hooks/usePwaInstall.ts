import { useSyncExternalStore } from 'react';
import { getInstallState, promptInstall, subscribeInstall, type InstallState } from '../utils/pwa';

/** État d'installation de l'application et action pour la proposer. */
export function usePwaInstall(): { state: InstallState; install: () => Promise<boolean> } {
  const state = useSyncExternalStore(subscribeInstall, getInstallState, () => 'unavailable' as InstallState);
  return { state, install: promptInstall };
}
