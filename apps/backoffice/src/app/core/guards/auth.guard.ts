import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';

export const authGuard: CanActivateFn = () => {
  const sessionService = inject(SessionService);
  const authService = inject(AuthService);
  const router = inject(Router);

  if (sessionService.isAuthenticated()) {
    return true;
  }

  // Pas de token en mémoire (ex: rechargement de page) : on tente de
  // restaurer la session à partir du cookie refresh token httpOnly
  // avant de rediriger vers le login.
  return authService.restoreSession().pipe(
    map(() => true),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};
