import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/session.service';

/**
 * Factory de guard : `permissionsGuard(['users:consulter'])` dans la
 * config de route. Vérification côté frontend pour l'UX (cacher les
 * écrans inaccessibles) — la vérification qui compte reste côté backend
 * (PermissionsGuard NestJS), jamais uniquement ici.
 */
export function permissionsGuard(requiredPermissions: string[]): CanActivateFn {
  return () => {
    const sessionService = inject(SessionService);
    const router = inject(Router);

    if (sessionService.hasAllPermissions(requiredPermissions)) {
      return true;
    }

    return router.createUrlTree(['/dashboard']);
  };
}
