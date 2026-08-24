import { SetMetadata } from '@nestjs/common';

export const SKIP_PASSWORD_CHECK_KEY = 'skipPasswordCheck';

/**
 * Exempte une route du blocage global appliqué quand
 * user.mustChangePassword === true (voir MustChangePasswordGuard).
 * Réservé aux routes strictement nécessaires pour permettre à
 * l'utilisateur de changer son mot de passe : /auth/me, /auth/logout,
 * /auth/change-password.
 */
export const SkipPasswordCheck = () =>
  SetMetadata(SKIP_PASSWORD_CHECK_KEY, true);
