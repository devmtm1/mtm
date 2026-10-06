/**
 * Écrans de l'application mobile. Les écrans « de détail » (fiche d'un bien,
 * d'une réalisation) ont leur propre barre d'action fixe en bas : ils
 * remplacent la barre d'onglets, comme dans une application native, et
 * affichent un bouton retour.
 */
const DETAIL = /^\/(terrains|locations|realisations|projets-a-venir)\/[^/]+\/?$/;

export function isDetailRoute(pathname: string): boolean {
  return DETAIL.test(pathname);
}

/** Écrans principaux où le bouton d'actions rapides est proposé. */
const FAB_ROUTES = new Set(['/', '/terrains', '/locations', '/favoris']);

export function showsQuickActions(pathname: string): boolean {
  return FAB_ROUTES.has(pathname.replace(/\/+$/, '') || '/');
}

export function showsTabBar(pathname: string): boolean {
  return !isDetailRoute(pathname);
}
