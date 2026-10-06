import { SetMetadata } from '@nestjs/common';

export const AUTHENTICATED_KEY = 'isAuthenticatedOnly';

/**
 * Marque une route accessible à tout utilisateur connecté, sans permission
 * particulière : portails client, propriétaire et locataire (leur périmètre
 * est borné par le compte lui-même), profil personnel, double authentification.
 *
 * C'est un choix explicite. Une route qui ne déclare ni
 * `@RequirePermissions`, ni `@Public`, ni `@Authenticated` est refusée : un
 * oubli ne doit jamais ouvrir une route par défaut.
 */
export const Authenticated = () => SetMetadata(AUTHENTICATED_KEY, true);
