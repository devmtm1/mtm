import { fetchPublications } from '../api/publications';
import type { Publication } from '../types/publication';
import { useAsyncData } from './useAsyncData';

/**
 * Vidéos de la page « Actualités et conseils ». Une panne de ce service ne doit pas vider la page :
 * les articles de texte restent affichés, la liste de vidéos est alors simplement vide.
 */
export function usePublications(): { publications: Publication[]; loading: boolean } {
  const { data, loading } = useAsyncData(fetchPublications, []);
  return { publications: (data ?? []).filter((publication) => Boolean(publication.videoUrl || publication.youtubeId)), loading };
}
