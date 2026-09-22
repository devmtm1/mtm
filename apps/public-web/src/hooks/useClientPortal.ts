import {
  fetchClientDemandes,
  fetchClientMissions,
  fetchClientPortal,
} from '../api/clientPortal';
import { useAsyncData } from './useAsyncData';

export function useClientPortal(token: string | null) {
  return useAsyncData(() => {
    if (!token) return Promise.reject(new Error('Session absente'));
    return fetchClientPortal(token);
  }, [token]);
}

export function useClientDemandes(token: string | null) {
  return useAsyncData(() => {
    if (!token) return Promise.reject(new Error('Session absente'));
    return fetchClientDemandes(token);
  }, [token]);
}

/** Missions de vérification foncière du client connecté (J2.2). */
export function useClientMissions(token: string | null) {
  return useAsyncData(() => {
    if (!token) return Promise.reject(new Error('Session absente'));
    return fetchClientMissions(token);
  }, [token]);
}
