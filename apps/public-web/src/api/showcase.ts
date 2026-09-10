import { apiClient } from './client';
import type { ShowcaseCategory, ShowcaseItem } from '../types/showcase';

export function fetchShowcaseItems(category?: ShowcaseCategory | string): Promise<ShowcaseItem[]> {
  return apiClient.get<ShowcaseItem[]>('/showcase', { category });
}
