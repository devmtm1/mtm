import type { Location, LocationFilters, LocationSortKey } from '../types/location';

/** « 350 000 FCFA » : le loyer sans mention de période (elle est affichée à part). */
export function formatLoyerMontant(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'Loyer sur demande';
  return `${Math.round(value).toLocaleString('fr-FR')} FCFA`;
}

/** Titre de l'annonce : celui saisi par MTM, sinon « Villa à Saly ». */
export function locationTitle(location: Pick<Location, 'titre' | 'type' | 'commune'>, typeLabel: string): string {
  if (location.titre?.trim()) return location.titre.trim();
  return location.commune ? `${typeLabel} à ${location.commune}` : typeLabel;
}

/** Localisation lisible : « Ngor, Dakar ». */
export function locationPlace(location: Pick<Location, 'commune' | 'region'>): string {
  return [location.commune, location.region].filter(Boolean).join(', ');
}

/**
 * Disponibilité annoncée. Une date passée ou absente veut dire « libre
 * maintenant » : afficher une date révolue ferait croire à un bien indisponible.
 */
export function disponibiliteLabel(disponibleLe: string | null, maintenant: Date = new Date()): string {
  if (!disponibleLe) return 'Disponible immédiatement';
  const date = new Date(disponibleLe);
  if (Number.isNaN(date.getTime()) || date.getTime() <= maintenant.getTime()) {
    return 'Disponible immédiatement';
  }
  return `Disponible dès le ${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

export function chambresLabel(nombre: number | null | undefined): string | null {
  if (nombre === null || nombre === undefined) return null;
  if (nombre === 0) return 'Studio';
  return `${nombre} chambre${nombre > 1 ? 's' : ''}`;
}

export function sallesEauLabel(nombre: number | null | undefined): string | null {
  if (nombre === null || nombre === undefined || nombre === 0) return null;
  return `${nombre} salle${nombre > 1 ? 's' : ''} d’eau`;
}

/** Libellés du tri proposé au visiteur, dans l'ordre d'affichage. */
export const LOCATION_SORTS: { key: LocationSortKey; label: string }[] = [
  { key: 'recent', label: 'Plus récentes' },
  { key: 'loyer_asc', label: 'Loyer croissant' },
  { key: 'loyer_desc', label: 'Loyer décroissant' },
  { key: 'superficie_desc', label: 'Plus grandes' },
];

/** Traduit le tri choisi en paramètres d'API. */
export function sortParams(key: LocationSortKey): Pick<LocationFilters, 'sortBy' | 'sortOrder'> {
  switch (key) {
    case 'loyer_asc':
      return { sortBy: 'loyerMensuel', sortOrder: 'asc' };
    case 'loyer_desc':
      return { sortBy: 'loyerMensuel', sortOrder: 'desc' };
    case 'superficie_desc':
      return { sortBy: 'superficie', sortOrder: 'desc' };
    default:
      return { sortBy: 'createdAt', sortOrder: 'desc' };
  }
}

/** Opération inverse : retrouve le tri affiché à partir de l'adresse. */
export function sortKeyFrom(filters: Pick<LocationFilters, 'sortBy' | 'sortOrder'>): LocationSortKey {
  if (filters.sortBy === 'loyerMensuel') return filters.sortOrder === 'desc' ? 'loyer_desc' : 'loyer_asc';
  if (filters.sortBy === 'superficie') return 'superficie_desc';
  return 'recent';
}
