import { fetchPromotions } from '../api/promotions';
import type { Promotion } from '../types/promotion';
import { useAsyncData } from './useAsyncData';

/**
 * Publicités et promotions à montrer à la place de la vidéo du bandeau. Une
 * liste vide — aucune en ligne, ou l'API injoignable — fait revenir le bandeau
 * habituel : une panne de ce service ne doit jamais vider l'accueil.
 */
export function useHeroPromotions(): { promotions: Promotion[]; loading: boolean } {
  const { data, loading } = useAsyncData(fetchPromotions, []);
  const promotions = (data ?? []).filter((promotion) => Boolean(promotion.mediaUrl));
  return { promotions, loading };
}
