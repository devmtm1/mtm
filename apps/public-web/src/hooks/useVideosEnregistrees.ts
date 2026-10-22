import { useSyncExternalStore } from 'react';

const CLE = 'mtm.videos-enregistrees';
const ecouteurs = new Set<() => void>();
let cache: string[] | null = null;

function lire(): string[] {
  if (cache) return cache;
  try {
    const valeur: unknown = JSON.parse(localStorage.getItem(CLE) ?? '[]');
    cache = Array.isArray(valeur) ? valeur.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    cache = [];
  }
  return cache;
}

function ecrire(identifiants: string[]): void {
  cache = identifiants;
  try {
    localStorage.setItem(CLE, JSON.stringify(identifiants));
  } catch {
    // Stockage plein ou interdit : la liste vit le temps de la page.
  }
  ecouteurs.forEach((ecouteur) => ecouteur());
}

function abonner(ecouteur: () => void): () => void {
  ecouteurs.add(ecouteur);
  return () => ecouteurs.delete(ecouteur);
}

/** Ajoute la vidéo aux enregistrées, ou la retire si elle y est déjà. */
export function basculerEnregistrement(identifiant: string): void {
  const liste = lire();
  ecrire(liste.includes(identifiant) ? liste.filter((x) => x !== identifiant) : [...liste, identifiant]);
}

/** Pour les tests : repart d'une liste vide et d'un cache neuf. */
export function reinitialiserVideosEnregistrees(): void {
  cache = null;
  try {
    localStorage.removeItem(CLE);
  } catch {
    // sans importance
  }
  ecouteurs.forEach((ecouteur) => ecouteur());
}

/**
 * Vidéos que le visiteur a mises de côté (« Enregistrer ») : une liste dans son navigateur, sans compte.
 * Elle se retrouve sous le filtre « Enregistrées » de la page Actualités et conseils.
 */
export function useVideosEnregistrees(): { identifiants: string[]; estEnregistree: (identifiant: string) => boolean; basculer: (identifiant: string) => void } {
  const identifiants = useSyncExternalStore(abonner, lire, () => []);
  return { identifiants, estEnregistree: (identifiant) => identifiants.includes(identifiant), basculer: basculerEnregistrement };
}
