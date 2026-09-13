/**
 * Groupes de rôles transversaux (section 24 du cahier des charges).
 *
 * Les noms de rôles sont ceux du seed ; les regrouper ici évite de recopier
 * la même liste dans chaque module — et donc de laisser un rôle de côté par
 * oubli (ce qui était le cas de « direction » dans le CRM).
 */

/** Voient et pilotent l'ensemble des dossiers, tous commerciaux confondus. */
export const SUPERVISION_ROLES = [
  'administrateur',
  'direction',
  'manager',
  'responsable_commercial',
] as const;

/** Peuvent publier un contenu ou un document sur le site public sans permission dédiée. */
export const PUBLISHER_ROLES = ['administrateur', 'direction'] as const;

/** Peuvent porter un prospect, un terrain ou un dossier de vente. */
export const COMMERCIAL_ROLES = [
  'commercial',
  'responsable_commercial',
  'manager',
  'administrateur',
] as const;

export function hasAnyRole(
  roles: readonly string[],
  group: readonly string[],
): boolean {
  return roles.some((role) => group.includes(role));
}

/** Utilisateur authentifié réduit à ce qui décide de son périmètre. */
export type ScopeUser = {
  roles: readonly string[];
  permissions?: readonly string[];
};

/**
 * Vue « tous dossiers » d'un module : rôles de supervision du seed, ou
 * permission `<module>:administrer` — ainsi un rôle créé dans le back-office
 * (Rôles & permissions) obtient le même périmètre qu'un manager sans
 * dépendre d'un nom de rôle codé en dur.
 */
export function hasSupervisionScope(
  user: ScopeUser,
  module: string,
  extraRoles: readonly string[] = [],
): boolean {
  return (
    hasAnyRole(user.roles, [...SUPERVISION_ROLES, ...extraRoles]) ||
    (user.permissions ?? []).includes(`${module}:administrer`)
  );
}
