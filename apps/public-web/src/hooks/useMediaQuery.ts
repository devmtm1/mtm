import { useSyncExternalStore } from 'react';

/**
 * Suit une requête média (ex. « (max-width: 1023px) »). Lue de façon
 * synchrone au premier rendu : l'interface mobile s'affiche d'emblée, sans
 * passer par l'interface ordinateur le temps d'un effet.
 *
 * Absente de l'environnement de test (jsdom) : la requête vaut alors `false`.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => undefined;
      const media = window.matchMedia(query);
      media.addEventListener('change', notify);
      return () => media.removeEventListener('change', notify);
    },
    () =>
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(query).matches
        : false,
    () => false,
  );
}

/** Téléphone et petite tablette : en dessous du point de rupture `lg` de Tailwind. */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 1023px)');
}
