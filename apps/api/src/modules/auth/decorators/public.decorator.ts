import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marque une route comme accessible sans authentification.
 * Toutes les autres routes sont protégées par défaut (JwtAuthGuard global).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
