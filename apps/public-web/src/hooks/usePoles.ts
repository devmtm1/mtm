import { fetchPoles } from '../api/poles';
import { useAsyncData } from './useAsyncData';

/** Les pôles d'activité publiés : la page « Nos services » et l'accueil les lisent ici, rien n'est écrit dans le site. */
export function usePoles() {
  return useAsyncData(() => fetchPoles(), []);
}
