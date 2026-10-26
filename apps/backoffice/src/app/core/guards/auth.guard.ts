import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, retry, throwError, timer } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';

/** Réseau coupé (0) ou serveur qui ne répond pas encore (5xx, par exemple un hébergeur qui se réveille). */
export function estPanneePassagere(erreur: unknown): boolean {
  return erreur instanceof HttpErrorResponse && (erreur.status === 0 || erreur.status >= 500);
}

export const DELAI_REPRISE_MS = 1500;
export const REPRISES_MAX = 3;

export const authGuard: CanActivateFn = () => {
  const sessionService = inject(SessionService);
  const authService = inject(AuthService);
  const router = inject(Router);

  if (sessionService.isAuthenticated()) {
    return true;
  }

  // Pas de token en mémoire (ex: rechargement de page) : on tente de
  // restaurer la session à partir du cookie refresh token httpOnly
  // avant de rediriger vers le login. Une panne passagère (API qui se
  // réveille, réseau coupé) est réessayée quelques secondes : le cookie
  // est toujours valable, ce n'est pas une session expirée.
  return authService.restoreSession().pipe(
    retry({
      count: REPRISES_MAX,
      delay: (erreur: unknown, essai: number) =>
        estPanneePassagere(erreur) ? timer(DELAI_REPRISE_MS * essai) : throwError(() => erreur),
    }),
    map(() => true),
    catchError((erreur: unknown) =>
      of(
        router.createUrlTree(
          ['/login'],
          estPanneePassagere(erreur) ? { queryParams: { raison: 'serveur' } } : {},
        ),
      ),
    ),
  );
};
