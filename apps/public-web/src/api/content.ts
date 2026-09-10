import { apiClient } from './client';
import type { ContentBlock, ContentBlockType } from '../types/content';

export function fetchContentBlocks(type?: ContentBlockType | string): Promise<ContentBlock[]> {
  return apiClient.get<ContentBlock[]>('/content', { type });
}

export function fetchContentBlock(key: string): Promise<ContentBlock> {
  return apiClient.get<ContentBlock>(`/content/${key}`);
}
