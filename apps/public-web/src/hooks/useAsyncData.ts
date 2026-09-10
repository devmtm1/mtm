import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Exécute `fetcher` à chaque changement de `deps` et expose un état
 * loading/error/data uniforme. Centralise la gestion d'erreur pour que
 * les hooks de domaine (useTerrainsCatalog, useContentBlocks...) n'aient
 * pas à dupliquer ce câblage.
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList,
): AsyncState<T> & { refetch: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(() => {
    let cancelled = false;
    setState((previous) => ({ ...previous, loading: true, error: null }));

    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof ApiError
            ? error.message
            : 'Impossible de charger les données pour le moment.';
        setState({ data: null, loading: false, error: message });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => load(), [load, reloadToken]);

  return { ...state, refetch: () => setReloadToken((token) => token + 1) };
}
