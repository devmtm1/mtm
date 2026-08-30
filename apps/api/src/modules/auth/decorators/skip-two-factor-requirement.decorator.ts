import { SetMetadata } from '@nestjs/common';

export const SKIP_TWO_FACTOR_REQUIREMENT_KEY = 'skipTwoFactorRequirement';

/**
 * Exempte une route du blocage global appliqué aux rôles sensibles sans 2FA.
 * Réservé aux routes nécessaires pour consulter sa session, activer le 2FA,
 * changer un mot de passe provisoire ou se déconnecter.
 */
export const SkipTwoFactorRequirement = () =>
  SetMetadata(SKIP_TWO_FACTOR_REQUIREMENT_KEY, true);
