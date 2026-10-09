import { apiClient } from './client';
import type { TeamPage } from '../types/team';

export function fetchTeam(): Promise<TeamPage> {
  return apiClient.get<TeamPage>('/team');
}
