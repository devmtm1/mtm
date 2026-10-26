import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';

/**
 * Attache le token d'accès (Bearer) à chaque requête vers l'API. Sur un
 * 401 (access token expiré), tente un refresh silencieux via le cookie
 * httpOnly (un seul à la fois, voir AuthService.refresh) puis rejoue la
 * requête initiale avec le nouveau token. Si le jeton a déjà été renouvelé
 * par une autre requête entre-temps, elle est simplement rejouée. Si le
 * refresh est refusé (401/403), nettoie la session et redirige vers /login ;
 * une erreur technique du refresh ne déconnecte pas.
 *
 * Les requêtes vers /auth/login et /auth/refresh sont exclues de cette
 * logique : un 401 sur /login est un échec d'identifiants normal (pas une
 * session expirée), et /auth/refresh est appelé via un HttpClient séparé
 * (voir AuthService.refresh) qui ne passe pas par cet intercepteur.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const sessionService = inject(SessionService);
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = sessionService.accessToken;
  const authorizedReq = req.clone({
    ...(token ? { setHeaders: { Authorization: `Bearer ${token}` } } : {}),
    withCredentials: true,
  });

  const isAuthEndpoint =
    req.url.includes('/auth/login') || req.url.includes('/auth/refresh');

  return next(authorizedReq).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 403 &&
        error.error?.code === 'TWO_FACTOR_REQUIRED'
      ) {
        void router.navigate(['/security']);
        return throwError(() => error);
      }
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !isAuthEndpoint
      ) {
        // Une autre requête a déjà renouvelé le jeton pendant que celle-ci attendait sa réponse : on la rejoue avec
        // le jeton actuel, sans redemander de renouvellement.
        const actuel = sessionService.accessToken;
        if (actuel && actuel !== token) {
          return next(
            req.clone({ setHeaders: { Authorization: `Bearer ${actuel}` }, withCredentials: true }),
          );
        }
        return authService.refresh().pipe(
          // Seul un refus du RENOUVELLEMENT lui-même ferme la session. Ce `catchError` est placé avant le rejeu : une
          // requête rejouée qui reçoit à son tour un 401 ou un 403 (droit insuffisant par exemple) est une erreur de
          // cette requête, pas une session expirée, et ne doit jamais déconnecter.
          catchError((refreshError: unknown) => {
            // Une panne passagère (5xx, réseau) ne doit pas déconnecter l'utilisateur, la prochaine requête
            // retentera.
            const refused =
              refreshError instanceof HttpErrorResponse &&
              (refreshError.status === 401 || refreshError.status === 403);
            if (refused) {
              sessionService.clearSession();
              void router.navigate(['/login']);
            }
            return throwError(() => refreshError);
          }),
          switchMap(({ accessToken }) => {
            sessionService.updateAccessToken(accessToken);
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${accessToken}` },
              withCredentials: true,
            });
            return next(retryReq);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};
