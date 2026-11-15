import { apiClient } from './client';
import type { Pole } from '../types/poles';

export function fetchPoles(): Promise<Pole[]> {
  return apiClient.get<Pole[]>('/poles');
}
