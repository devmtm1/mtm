import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { SessionService } from '../services/session.service';
import { SENSITIVE_ROLES } from '../../features/admin/admin-labels';

export const twoFactorGuard: CanActivateChildFn = (childRoute) => {
  const sessionService = inject(SessionService);
  const router = inject(Router);
  const user = sessionService.user();

  // L’utilisateur doit pouvoir atteindre Sécurité pour activer son 2FA.
  if (childRoute.routeConfig?.path === 'security') return true;

  const requiresTwoFactor =
    user?.roles.some((role) => SENSITIVE_ROLES.has(role)) &&
    !user.twoFactorEnabled;

  return requiresTwoFactor
    ? router.createUrlTree(['/security'])
    : true;
};