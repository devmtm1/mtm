import { fetchContentBlocks } from '../api/content';
import type { ContentBlockType } from '../types/content';
import { useAsyncData } from './useAsyncData';

export function useContentBlocks(type?: ContentBlockType | string) {
  return useAsyncData(() => fetchContentBlocks(type), [type]);
}
