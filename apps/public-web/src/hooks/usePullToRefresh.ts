import { useEffect, useRef, useState } from 'react';

/** Distance de tirage (en pixels de l'indicateur) à partir de laquelle on relâche pour actualiser. */
export const PULL_THRESHOLD = 64;
export const PULL_MAX = 96;

/** Le doigt descend de `dy`, l'indicateur suit à moitié : une résistance, comme sur une application native. */
export function pullDistance(dy: number): number {
  return dy <= 0 ? 0 : Math.min(Math.round(dy * 0.5), PULL_MAX);
}

/**
 * Geste « tirer pour actualiser » : en haut de page, tirer vers le bas puis
 * relâcher recharge les données. N'agit que sur un seul doigt, en haut de page,
 * et jamais pendant un défilement normal ni un défilement horizontal.
 */
export function usePullToRefresh(onRefresh: () => void | Promise<void>, enabled: boolean) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const startX = useRef(0);
  const current = useRef(0);
  const callback = useRef(onRefresh);

  useEffect(() => {
    callback.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled) return;

    const onStart = (event: TouchEvent) => {
      const ok = window.scrollY <= 0 && event.touches.length === 1;
      startY.current = ok ? event.touches[0].clientY : null;
      startX.current = ok ? event.touches[0].clientX : 0;
    };

    const onMove = (event: TouchEvent) => {
      if (startY.current === null) return;
      const dy = event.touches[0].clientY - startY.current;
      const dx = Math.abs(event.touches[0].clientX - startX.current);
      // Un geste plutôt horizontal (carrousel) ou un retour en arrière n'est pas un tirage.
      if (dy <= 0 || dx > dy || window.scrollY > 0) {
        current.current = 0;
        setPull(0);
        return;
      }
      current.current = pullDistance(dy);
      setPull(current.current);
    };

    const onEnd = () => {
      const assez = current.current >= PULL_THRESHOLD;
      startY.current = null;
      current.current = 0;
      setPull(0);
      if (!assez) return;
      setRefreshing(true);
      void Promise.resolve(callback.current()).finally(() => window.setTimeout(() => setRefreshing(false), 800));
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', onEnd);
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onEnd);
    };
  }, [enabled]);

  return { pull, refreshing };
}
