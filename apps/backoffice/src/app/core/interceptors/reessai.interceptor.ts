import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { retry, throwError, timer } from 'rxjs';

/** Réseau coupé un instant (0) ou serveur qui redémarre (502, 503, 504) : ça passe souvent à la seconde tentative. */
const STATUTS_TRANSITOIRES = new Set([0, 502, 503, 504]);
export const DELAI_REESSAI_MS = 700;

/**
 * Relit une fois, après une courte pause, une lecture (GET) qui a échoué sur une coupure passagère.
 * Seules les lectures sont rejouées : rejouer un enregistrement risquerait de le faire deux fois.
 */
export const reessaiInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET') return next(req);
  return next(req).pipe(
    retry({
      count: 1,
      delay: (erreur: unknown) =>
        erreur instanceof HttpErrorResponse && STATUTS_TRANSITOIRES.has(erreur.status)
          ? timer(DELAI_REESSAI_MS)
          : throwError(() => erreur),
    }),
  );
};
