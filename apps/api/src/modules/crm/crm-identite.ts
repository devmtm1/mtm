/**
 * Identité d'un client (date et lieu de naissance, pièce d'identité) : une donnée
 * sensible, qui sert à établir les factures et rapports d'une mission mais que
 * tous les collaborateurs du CRM n'ont pas à lire. Elle n'est visible, et ne se
 * modifie, qu'avec la permission `crm:identite`.
 */
export const CHAMPS_IDENTITE = [
  'dateNaissance',
  'lieuNaissance',
  'typePieceIdentite',
  'numeroPieceIdentite',
] as const;

export const PERMISSION_IDENTITE = 'crm:identite';

type AvecPermissions = { permissions?: string[] };

export function peutVoirIdentite(user: AvecPermissions): boolean {
  return user.permissions?.includes(PERMISSION_IDENTITE) ?? false;
}

function nettoyer(objet: Record<string, unknown>): Record<string, unknown> {
  const copie = { ...objet };
  for (const champ of CHAMPS_IDENTITE) delete copie[champ];
  return copie;
}

/**
 * Retire les champs d'identité d'une fiche, d'une liste de fiches (`items`) ou
 * d'une fiche 360 (`prospect`). Sert aussi pour le journal d'audit : le numéro
 * d'une pièce d'identité n'a pas à y être recopié à chaque modification.
 */
export function retirerIdentite<T>(valeur: T): T {
  if (Array.isArray(valeur)) {
    return valeur.map((element: unknown) => retirerIdentite(element)) as T;
  }
  if (!valeur || typeof valeur !== 'object' || valeur instanceof Date) {
    return valeur;
  }
  const objet = nettoyer(valeur as Record<string, unknown>);
  if (Array.isArray(objet.items)) objet.items = retirerIdentite(objet.items);
  if (objet.prospect && typeof objet.prospect === 'object') {
    objet.prospect = retirerIdentite(objet.prospect);
  }
  return objet as T;
}

/** La valeur telle quelle pour qui a la permission, sans identité pour les autres. */
export function masquerIdentite<T>(valeur: T, user: AvecPermissions): T {
  return peutVoirIdentite(user) ? valeur : retirerIdentite(valeur);
}
