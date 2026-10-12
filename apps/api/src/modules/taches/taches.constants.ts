export const PRIORITES_TACHE = [
  'basse',
  'moyenne',
  'haute',
  'urgente',
] as const;
export const STATUTS_TACHE = [
  'a_faire',
  'en_cours',
  'terminee',
  'annulee',
] as const;

/** Statuts d’une tâche encore à faire : ce sont elles qu’on relance. */
export const STATUTS_TACHE_OUVERTS: readonly string[] = ['a_faire', 'en_cours'];

export type PrioriteTache = (typeof PRIORITES_TACHE)[number];
export type StatutTache = (typeof STATUTS_TACHE)[number];

export const PERMISSION_ADMIN_TACHES = 'taches:administrer';
