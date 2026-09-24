import {
  fetchClientDemandes,
  fetchClientMissions,
  fetchClientPortal,
  fetchLocataireBaux,
  fetchLocataireIncidents,
  fetchLocatairePaiements,
  fetchProprietaireBiens,
  fetchProprietaireDocuments,
  fetchProprietaireSynthese,
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

/** Espace propriétaire (J2.1) : `data` reste `null` si le compte n'en est pas un. */
export function useProprietaireBiens(token: string | null) {
  return useAsyncData(() => {
    if (!token) return Promise.reject(new Error('Session absente'));
    return fetchProprietaireBiens(token);
  }, [token]);
}

export function useProprietaireSynthese(token: string | null) {
  return useAsyncData(() => {
    if (!token) return Promise.reject(new Error('Session absente'));
    return fetchProprietaireSynthese(token);
  }, [token]);
}

export function useProprietaireDocuments(token: string | null) {
  return useAsyncData(() => {
    if (!token) return Promise.reject(new Error('Session absente'));
    return fetchProprietaireDocuments(token);
  }, [token]);
}

/** Espace locataire (J2.1) : `data` reste `null` si le compte n'en est pas un. */
export function useLocataireBaux(token: string | null) {
  return useAsyncData(() => {
    if (!token) return Promise.reject(new Error('Session absente'));
    return fetchLocataireBaux(token);
  }, [token]);
}

export function useLocatairePaiements(token: string | null) {
  return useAsyncData(() => {
    if (!token) return Promise.reject(new Error('Session absente'));
    return fetchLocatairePaiements(token);
  }, [token]);
}

export function useLocataireIncidents(token: string | null) {
  return useAsyncData(() => {
    if (!token) return Promise.reject(new Error('Session absente'));
    return fetchLocataireIncidents(token);
  }, [token]);
}
