import type L from 'leaflet';

/**
 * Force Leaflet à remesurer son conteneur dès que celui-ci change de taille.
 *
 * Depuis le découpage par route, la feuille de style de Leaflet arrive avec
 * le chunk de la page : la carte peut s'initialiser une fraction de seconde
 * avant qu'elle soit appliquée, sur un conteneur aux dimensions provisoires.
 * Leaflet ne recalcule jamais de lui-même — d'où des tuiles manquantes sur
 * une partie de la carte. Même besoin quand la carte apparaît dans un onglet
 * ou après une animation d'entrée.
 *
 * Renvoie la fonction de nettoyage à appeler avec `map.remove()`.
 */
export function observeMapResize(map: L.Map, container: HTMLElement): () => void {
  const observer = new ResizeObserver(() => map.invalidateSize({ animate: false }));
  observer.observe(container);
  // Premier recalcul après le rendu courant, au cas où la taille était déjà
  // définitive mais le CSS pas encore appliqué à l'initialisation.
  const frame = requestAnimationFrame(() => map.invalidateSize({ animate: false }));
  return () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
  };
}
