import { fetchShowcaseItems } from '../api/showcase';
import type { ShowcaseCategory } from '../types/showcase';
import { useAsyncData } from './useAsyncData';

export function useShowcase(category?: ShowcaseCategory | string) {
  return useAsyncData(() => fetchShowcaseItems(category), [category]);
}
