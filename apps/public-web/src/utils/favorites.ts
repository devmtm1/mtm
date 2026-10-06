/**
 * Favoris du visiteur, gardés sur son appareil (aucun compte requis). On ne
 * garde que l'identifiant : le bien lui-même est relu à l'affichage, pour que
 * le prix et la disponibilité soient toujours ceux d'aujourd'hui.
 */
export type FavoriteKind = 'terrain' | 'location';

export interface FavoriteEntry {
  kind: FavoriteKind;
  id: string;
  addedAt: number;
}

const STORAGE_KEY = 'mtm:favoris:v1';
const CHANGE_EVENT = 'mtm:favoris-change';
const MAX_FAVORITES = 200;

function isEntry(value: unknown): value is FavoriteEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    (entry.kind === 'terrain' || entry.kind === 'location') &&
    typeof entry.id === 'string' &&
    entry.id.length > 0 &&
    typeof entry.addedAt === 'number'
  );
}

/** Lecture tolérante : un stockage absent, bloqué ou corrompu donne « aucun favori ». */
export function readFavorites(): FavoriteEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    return [];
  }
}

function writeFavorites(entries: FavoriteEntry[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_FAVORITES)));
  } catch {
    // Mode privé ou quota plein : le favori ne survivra pas au rechargement,
    // mais l'application continue de fonctionner.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function isFavorite(entries: FavoriteEntry[], kind: FavoriteKind, id: string): boolean {
  return entries.some((entry) => entry.kind === kind && entry.id === id);
}

/** Ajoute le bien aux favoris, ou l'en retire ; renvoie le nouvel état. */
export function toggleFavorite(kind: FavoriteKind, id: string): boolean {
  const entries = readFavorites();
  if (isFavorite(entries, kind, id)) {
    writeFavorites(entries.filter((entry) => !(entry.kind === kind && entry.id === id)));
    return false;
  }
  // Les plus récents d'abord : c'est ce que le visiteur vient de regarder.
  writeFavorites([{ kind, id, addedAt: Date.now() }, ...entries]);
  return true;
}

export function removeFavorite(kind: FavoriteKind, id: string): void {
  writeFavorites(readFavorites().filter((entry) => !(entry.kind === kind && entry.id === id)));
}

/** Abonnement aux changements, y compris ceux faits depuis un autre onglet. */
export function subscribeFavorites(callback: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEY) callback();
  };
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener('storage', onStorage);
  };
}
