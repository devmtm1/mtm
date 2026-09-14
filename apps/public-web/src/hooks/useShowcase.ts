import { fetchShowcaseItem, fetchShowcaseItems } from '../api/showcase';
import type { ShowcaseCategory } from '../types/showcase';
import { useAsyncData } from './useAsyncData';

export function useShowcase(category?: ShowcaseCategory | string) {
  return useAsyncData(() => fetchShowcaseItems(category), [category]);
}

export function useShowcaseItem(id: string | undefined) {
  return useAsyncData(() => {
    if (!id) return Promise.reject(new Error('Identifiant manquant'));
    return fetchShowcaseItem(id);
  }, [id]);
}
