import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import {
  isFavorite,
  readFavorites,
  subscribeFavorites,
  toggleFavorite,
  type FavoriteEntry,
  type FavoriteKind,
} from '../utils/favorites';

const EMPTY: FavoriteEntry[] = [];

/**
 * Favoris du visiteur. La liste lue est mémorisée tant que le contenu ne change
 * pas : `useSyncExternalStore` exige une valeur stable entre deux lectures,
 * sans quoi l'écran se redessinerait en boucle.
 */
export function useFavorites() {
  const cache = useRef<{ raw: string; entries: FavoriteEntry[] }>({ raw: '[]', entries: EMPTY });

  const getSnapshot = useCallback((): FavoriteEntry[] => {
    const entries = readFavorites();
    const raw = JSON.stringify(entries);
    if (raw !== cache.current.raw) cache.current = { raw, entries };
    return cache.current.entries;
  }, []);

  const entries = useSyncExternalStore(subscribeFavorites, getSnapshot, () => EMPTY);

  return useMemo(
    () => ({
      entries,
      count: entries.length,
      isFavorite: (kind: FavoriteKind, id: string) => isFavorite(entries, kind, id),
      toggle: (kind: FavoriteKind, id: string) => toggleFavorite(kind, id),
    }),
    [entries],
  );
}
