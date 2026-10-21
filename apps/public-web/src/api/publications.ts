import { apiClient } from './client';
import type { Publication } from '../types/publication';

/** Vidéos en ligne de « Actualités et conseils », la vidéo à la une d'abord. */
export function fetchPublications(): Promise<Publication[]> {
  return apiClient.get<Publication[]>('/publications');
}
