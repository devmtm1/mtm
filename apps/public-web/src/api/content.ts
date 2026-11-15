import { apiClient } from './client';
import type { ContentBlock, ContentBlockType } from '../types/content';

export function fetchContentBlocks(type?: ContentBlockType | string): Promise<ContentBlock[]> {
  return apiClient.get<ContentBlock[]>('/content', { type });
}
