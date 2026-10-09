import { fetchTeam } from '../api/team';
import { useAsyncData } from './useAsyncData';

export function useTeam() {
  return useAsyncData(() => fetchTeam(), []);
}
