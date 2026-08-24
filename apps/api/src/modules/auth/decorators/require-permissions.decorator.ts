import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'requiredPermissions';

/**
 * Déclare les permissions requises pour accéder à une route, au format
 * "resource:action" (ex: "users:creer", "settings:administrer").
 * Vérifié par PermissionsGuard, toujours côté backend — jamais uniquement
 * côté Angular (exigence explicite du cahier des charges, section 24).
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
