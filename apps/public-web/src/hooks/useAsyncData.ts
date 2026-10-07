import { useCallback, useEffect, useRef, useState } from 'react';
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
): AsyncState<T> & { refetch: (options?: { silent?: boolean }) => void } {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });
  const [reloadToken, setReloadToken] = useState(0);
  // Rechargement « silencieux » : l'écran garde ses données et n'affiche ni
  // squelette ni erreur le temps de la mise à jour (retour sur l'application,
  // geste d'actualisation).
  const silent = useRef(false);

  const load = useCallback(() => {
    let cancelled = false;
    const discret = silent.current;
    silent.current = false;
    if (!discret) setState((previous) => ({ ...previous, loading: true, error: null }));

    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // Une actualisation qui échoue ne doit pas effacer ce que l'on affichait.
        if (discret) return;
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

  return {
    ...state,
    refetch: (options?: { silent?: boolean }) => {
      silent.current = options?.silent === true;
      setReloadToken((token) => token + 1);
    },
  };
}
