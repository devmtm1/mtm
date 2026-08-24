import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/session.service';

/**
 * Empêche l'accès aux écrans applicatifs tant que l'utilisateur n'a pas
 * changé son mot de passe provisoire. Complète le blocage déjà appliqué
 * côté backend (MustChangePasswordGuard) — celui-ci reste la protection
 * qui compte réellement ; celui-ci n'est que pour l'UX (éviter d'afficher
 * un écran puis de le voir échouer sur chaque appel API).
 */
export const passwordChangeGuard: CanActivateFn = () => {
  const sessionService = inject(SessionService);
  const router = inject(Router);

  if (sessionService.user()?.mustChangePassword) {
    return router.createUrlTree(['/change-password']);
  }

  return true;
};
