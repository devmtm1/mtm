import { apiClient } from './client';
import type { Promotion } from '../types/promotion';

/** Promotions en ligne, dans l'ordre d'affichage. */
export function fetchPromotions(): Promise<Promotion[]> {
  return apiClient.get<Promotion[]>('/promotions');
}
