import { describe, expect, it } from 'vitest';
import { isDetailRoute, showsQuickActions, showsTabBar } from './mobile-routes';

describe('écrans de l’application mobile', () => {
  it.each([
    '/terrains/abc',
    '/locations/00000000-0000-4000-8000-000000000001',
    '/realisations/r1',
    '/projets-a-venir/p1/',
  ])('« %s » est un écran de détail : pas de barre d’onglets', (path) => {
    expect(isDetailRoute(path)).toBe(true);
    expect(showsTabBar(path)).toBe(false);
  });

  it.each(['/', '/terrains', '/locations', '/favoris', '/contact', '/a-propos', '/gestion-locative'])(
    '« %s » garde la barre d’onglets',
    (path) => {
      expect(isDetailRoute(path)).toBe(false);
      expect(showsTabBar(path)).toBe(true);
    },
  );

  it('les actions rapides ne se proposent que sur les écrans principaux', () => {
    for (const path of ['/', '/terrains', '/locations', '/favoris', '/locations/']) {
      expect(showsQuickActions(path)).toBe(true);
    }
    for (const path of ['/contact', '/terrains/abc', '/a-propos', '/demarches-administratives']) {
      expect(showsQuickActions(path)).toBe(false);
    }
  });
});
