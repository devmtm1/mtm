import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';

/**
 * Attache le token d'accès (Bearer) à chaque requête vers l'API. Sur un
 * 401 (access token expiré), tente un refresh silencieux via le cookie
 * httpOnly puis rejoue la requête initiale avec le nouveau token. Si le
 * refresh échoue également, nettoie la session et redirige vers /login.
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
        error.status === 401 &&
        !isAuthEndpoint
      ) {
        return authService.refresh().pipe(
          switchMap(({ accessToken }) => {
            sessionService.updateAccessToken(accessToken);
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${accessToken}` },
              withCredentials: true,
            });
            return next(retryReq);
          }),
          catchError((refreshError: unknown) => {
            sessionService.clearSession();
            void router.navigate(['/login']);
            return throwError(() => refreshError);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};
