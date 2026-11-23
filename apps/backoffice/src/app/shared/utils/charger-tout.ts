import { Observable, forkJoin, map, of, switchMap } from 'rxjs';

/** Une page de résultats telle que la renvoient les API de liste. */
export interface PageResultats<T> {
  items: T[];
  total: number;
}

/** Nombre de lignes demandé par appel : le maximum que les API acceptent. */
export const TAILLE_PAGE_MAX = 200;

/**
 * Charge TOUTES les lignes d'une liste, page après page, au lieu de s'arrêter à la première. Les listes de choix et les
 * tableaux qui demandaient « 200 lignes » coupaient en silence au-delà : un 201e client n'apparaissait plus dans la liste.
 * Les pages suivantes sont demandées ensemble ; `plafond` borne le total pour qu'un très gros portefeuille ne bloque pas l'écran.
 */
export function chargerTout<T>(
  chargerPage: (page: number, taille: number) => Observable<PageResultats<T>>,
  taille: number = TAILLE_PAGE_MAX,
  plafond = 5000,
): Observable<PageResultats<T>> {
  return chargerPage(1, taille).pipe(
    switchMap((premiere) => {
      const visees = Math.min(premiere.total, plafond);
      const pages = Math.ceil(visees / taille);
      if (pages <= 1) return of(premiere);
      return forkJoin(Array.from({ length: pages - 1 }, (_, i) => chargerPage(i + 2, taille))).pipe(
        map((suite) => ({
          items: [...premiere.items, ...suite.flatMap((page) => page.items)].slice(0, plafond),
          total: premiere.total,
        })),
      );
    }),
  );
}
